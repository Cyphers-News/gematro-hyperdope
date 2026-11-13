#!/usr/bin/env python3
"""Render a canonical Markdown spec as a deterministic local change atlas."""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import os
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit


RENDERER_VERSION = "1"
GENERATOR_ID = f"repository-continuity-change-atlas/{RENDERER_VERSION}"
MAX_SPEC_BYTES = 2_000_000
MAX_IMAGE_BYTES = 5_000_000
MAX_TOTAL_IMAGE_BYTES = 12_000_000
VALID_STATUSES = {"draft", "accepted", "retired", "rejected"}

SECTION_RE = re.compile(r"^##[ \t]+(.+?)\s*$")
SUBSECTION_RE = re.compile(r"^###[ \t]+(.+?)\s*$")
STATUS_RE = re.compile(r"^\s*status:\s*([a-z-]+)\s*$", re.IGNORECASE | re.MULTILINE)
TITLE_RE = re.compile(r"^#[ \t]+(?:spec:\s*)?(.+?)\s*$", re.IGNORECASE | re.MULTILINE)
IMAGE_RE = re.compile(
    r'^!\[(?P<alt>[^\]]+)\]\((?P<path><[^>]+>|[^)\s]+)(?:\s+"[^"]*")?\)\s*$'
)
TOKEN_RE = re.compile(r"\[\[([A-Z0-9_]+)\]\]")
SOURCE_META_RE = re.compile(r'<meta name="atlas-source" content="([^"]*)">')
SOURCE_ID_META_RE = re.compile(r'<meta name="atlas-source-id" content="([0-9a-f]{64})">')


class AtlasError(ValueError):
    """A safe, user-facing rendering failure."""


@dataclass(frozen=True)
class ReviewImage:
    alt: str
    source: str
    mime_type: str
    data: bytes


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render or verify a deterministic static change atlas for one Markdown spec."
    )
    parser.add_argument("spec", help="canonical Markdown spec")
    parser.add_argument(
        "--output",
        required=True,
        help="explicit output HTML path",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="compare the existing output with a fresh in-memory render without writing",
    )
    return parser.parse_args(argv)


def normalize_text(value: str) -> str:
    return " ".join(value.split())


def escaped_text(value: str) -> str:
    return html.escape(normalize_text(value), quote=True)


def read_spec(path: Path) -> tuple[bytes, str]:
    if path.is_symlink():
        raise AtlasError("the canonical spec must not be a symbolic link")
    if not path.is_file():
        raise AtlasError(f"spec is not a regular file: {path}")
    raw = path.read_bytes()
    if len(raw) > MAX_SPEC_BYTES:
        raise AtlasError(f"spec exceeds the {MAX_SPEC_BYTES}-byte limit")
    try:
        return raw, raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise AtlasError("spec must be UTF-8 Markdown") from exc


def split_sections(text: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {"preamble": []}
    current = "preamble"
    for line in text.splitlines():
        match = SECTION_RE.match(line)
        if match:
            current = normalize_text(match.group(1)).lower()
            sections.setdefault(current, [])
            continue
        sections[current].append(line)
    return {key: "\n".join(lines).strip() for key, lines in sections.items()}


def first_paragraph(text: str) -> str:
    paragraphs = re.split(r"\n\s*\n", text.strip())
    for paragraph in paragraphs:
        value = normalize_text(paragraph)
        if value:
            return value
    return "not declared"


def parse_bullets(text: str) -> list[str]:
    items: list[str] = []
    current: list[str] | None = None
    for raw_line in text.splitlines():
        line = raw_line.strip()
        match = re.match(r"^-[ \t]+(.+)$", line)
        if match:
            if current:
                items.append(normalize_text(" ".join(current)))
            current = [match.group(1)]
        elif current is not None and line and not line.startswith(("#", "|")):
            current.append(line)
    if current:
        items.append(normalize_text(" ".join(current)))
    return items


def parse_owner_view(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for item in parse_bullets(text):
        key, separator, value = item.partition(":")
        if separator and key.strip().lower() in {"change", "before", "after", "authority"}:
            values[key.strip().lower()] = normalize_text(value)
    return values


def parse_scope(text: str) -> tuple[list[str], list[str]]:
    included: list[str] = []
    excluded: list[str] = []
    target: list[str] | None = None
    current: list[str] | None = None

    def finish_item() -> None:
        nonlocal current
        if target is not None and current:
            target.append(normalize_text(" ".join(current)))
        current = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        lowered = line.lower()
        if lowered == "in:":
            finish_item()
            target = included
            continue
        if lowered == "out:":
            finish_item()
            target = excluded
            continue
        match = re.match(r"^-[ \t]+(.+)$", line)
        if match and target is not None:
            finish_item()
            current = [match.group(1)]
        elif current is not None and line and not line.startswith(("#", "|")):
            current.append(line)
    finish_item()
    return included, excluded


def parse_change_shape(text: str) -> list[tuple[str, str, str, str]]:
    rows: list[list[str]] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cells = [normalize_text(cell) for cell in stripped.strip("|").split("|")]
        if len(cells) != 4:
            continue
        if all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in cells):
            continue
        rows.append(cells)
    if rows and rows[0][0].lower() == "dimension":
        rows = rows[1:]
    return [tuple(row) for row in rows]  # type: ignore[list-item]


def parse_subsections(text: str) -> list[tuple[str, list[str]]]:
    sections: list[tuple[str, list[str]]] = []
    title: str | None = None
    body: list[str] = []
    for line in text.splitlines():
        match = SUBSECTION_RE.match(line)
        if match:
            if title is not None:
                sections.append((title, body))
            title = normalize_text(match.group(1))
            body = []
        elif title is not None:
            body.append(line)
    if title is not None:
        sections.append((title, body))
    return sections


def is_none_item(value: str) -> bool:
    lowered = normalize_text(value).lower()
    return lowered == "none" or lowered.startswith(("none.", "none;", "none —", "none -"))


def parse_decisions(owner_decisions: str, open_questions: str) -> list[tuple[str, list[str]]]:
    decisions = parse_subsections(owner_decisions)
    if decisions:
        return decisions
    questions = [item for item in parse_bullets(open_questions) if not is_none_item(item)]
    return [(f"decision {index:02d}", [f"question: {question}"]) for index, question in enumerate(questions, 1)]


def ensure_local_image(spec_dir: Path, raw_reference: str, alt: str) -> ReviewImage:
    reference = raw_reference[1:-1] if raw_reference.startswith("<") else raw_reference
    if not alt.strip():
        raise AtlasError("review images require descriptive alt text")
    if any(character in reference for character in ("%", "\\", "\x00")):
        raise AtlasError(f"unsafe review image path: {raw_reference}")
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment:
        raise AtlasError(f"review images must use plain local relative paths: {raw_reference}")
    relative = Path(parsed.path)
    if relative.is_absolute() or not relative.parts or ".." in relative.parts:
        raise AtlasError(f"review image escapes the spec directory: {raw_reference}")

    cursor = spec_dir
    for part in relative.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise AtlasError(f"review image path contains a symbolic link: {raw_reference}")

    candidate = (spec_dir / relative).resolve()
    root = spec_dir.resolve()
    if not candidate.is_relative_to(root):
        raise AtlasError(f"review image escapes the spec directory: {raw_reference}")
    if not candidate.is_file():
        raise AtlasError(f"review image is not a regular file: {raw_reference}")

    data = candidate.read_bytes()
    if len(data) > MAX_IMAGE_BYTES:
        raise AtlasError(f"review image exceeds the {MAX_IMAGE_BYTES}-byte limit: {raw_reference}")

    suffix = candidate.suffix.lower()
    if suffix == ".png" and data.startswith(b"\x89PNG\r\n\x1a\n"):
        mime_type = "image/png"
    elif suffix in {".jpg", ".jpeg"} and data.startswith(b"\xff\xd8\xff"):
        mime_type = "image/jpeg"
    elif suffix == ".webp" and len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        mime_type = "image/webp"
    else:
        raise AtlasError(f"review image must be a validated PNG, JPEG, or WebP file: {raw_reference}")
    return ReviewImage(normalize_text(alt), reference, mime_type, data)


def parse_review_images(text: str, spec_dir: Path) -> list[ReviewImage]:
    images: list[ReviewImage] = []
    total = 0
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or is_none_item(line.removeprefix("- ")):
            continue
        match = IMAGE_RE.fullmatch(line)
        if match is None:
            raise AtlasError(
                "review visuals accept only one local Markdown image per line or an explicit 'none'"
            )
        image = ensure_local_image(spec_dir, match.group("path"), match.group("alt"))
        total += len(image.data)
        if total > MAX_TOTAL_IMAGE_BYTES:
            raise AtlasError(f"review images exceed the {MAX_TOTAL_IMAGE_BYTES}-byte total limit")
        images.append(image)
    return images


def repository_relative_label(spec_path: Path) -> str:
    resolved = spec_path.resolve()
    for candidate in (resolved.parent, *resolved.parents):
        if (candidate / ".git").exists():
            return resolved.relative_to(candidate).as_posix()
    return resolved.name


def source_identity(spec_path: Path) -> str:
    """Bind overwrite permission to one path without exposing that path."""
    resolved = os.fsencode(spec_path.resolve())
    return hashlib.sha256(resolved).hexdigest()


def render_list(items: list[str], empty: str) -> str:
    if not items:
        return f'<p class="empty">{escaped_text(empty)}</p>'
    body = "".join(f"<li>{escaped_text(item)}</li>" for item in items)
    return f'<ul class="signal-list">{body}</ul>'


def render_change_shape(rows: list[tuple[str, str, str, str]]) -> str:
    if not rows:
        return '<p class="empty">no change-shape matrix was declared.</p>'
    cards: list[str] = []
    for dimension, changed, owner, proof in rows:
        state = changed.strip().lower()
        state_class = state if state in {"yes", "no"} else "unknown"
        cards.append(
            '<article class="shape-card">'
            f'<div class="shape-state shape-state--{state_class}">{escaped_text(changed)}</div>'
            f'<h3>{escaped_text(dimension)}</h3>'
            f'<p><span>source</span>{escaped_text(owner or "not declared")}</p>'
            f'<p><span>proof</span>{escaped_text(proof or "not declared")}</p>'
            "</article>"
        )
    return "".join(cards)


def render_decisions(decisions: list[tuple[str, list[str]]]) -> str:
    if not decisions:
        return '<p class="empty">no owner decisions remain open.</p>'
    cards: list[str] = []
    for title, lines in decisions:
        fields: list[str] = []
        for line in parse_bullets("\n".join(lines)):
            label, separator, value = line.partition(":")
            if separator:
                fields.append(
                    f'<p><span>{escaped_text(label)}</span>{escaped_text(value)}</p>'
                )
            else:
                fields.append(f"<p>{escaped_text(line)}</p>")
        if not fields:
            body = first_paragraph("\n".join(lines))
            fields.append(f"<p>{escaped_text(body)}</p>")
        cards.append(
            '<article class="decision-card">'
            f'<p class="card-index">owner fork</p><h3>{escaped_text(title)}</h3>'
            f'{"".join(fields)}</article>'
        )
    return "".join(cards)


def render_visuals(images: list[ReviewImage]) -> str:
    if not images:
        return (
            '<p class="empty">no review images were attached; the transition rail remains the visual summary.</p>'
        )
    figures: list[str] = []
    for image in images:
        encoded = base64.b64encode(image.data).decode("ascii")
        figures.append(
            '<figure class="review-visual">'
            f'<img src="data:{image.mime_type};base64,{encoded}" alt="{html.escape(image.alt, quote=True)}">'
            f'<figcaption>{escaped_text(image.alt)}</figcaption>'
            "</figure>"
        )
    return "".join(figures)


def render_template(template: str, values: dict[str, str]) -> str:
    unknown = sorted(set(TOKEN_RE.findall(template)) - values.keys())
    if unknown:
        raise AtlasError(f"atlas template has unknown token(s): {', '.join(unknown)}")
    # Substitute the template exactly once. Token-shaped source prose inside an
    # escaped value is content, not another renderer instruction.
    return TOKEN_RE.sub(lambda match: values[match.group(1)], template)


def build_atlas(spec_path: Path) -> bytes:
    raw, text = read_spec(spec_path)
    title_match = TITLE_RE.search(text)
    status_match = STATUS_RE.search("\n".join(text.splitlines()[:25]))
    if title_match is None:
        raise AtlasError("spec has no level-one title")
    if status_match is None:
        raise AtlasError("spec has no status line in its first 25 lines")
    status = status_match.group(1).lower()
    if status not in VALID_STATUSES:
        raise AtlasError(f"unsupported spec status: {status}")

    sections = split_sections(text)
    owner_view = parse_owner_view(sections.get("owner view", ""))
    context = first_paragraph(sections.get("context", ""))
    included, excluded = parse_scope(sections.get("scope", ""))
    decisions = parse_decisions(
        sections.get("owner decisions", ""), sections.get("open questions", "")
    )
    images = parse_review_images(sections.get("review visuals", ""), spec_path.parent)
    change_shape = parse_change_shape(sections.get("change shape", ""))
    risks = [item for item in parse_bullets(sections.get("risks and unknowns", "")) if not is_none_item(item)]
    proof = [item for item in parse_bullets(sections.get("done when", "")) if not is_none_item(item)]

    source_hash = hashlib.sha256(raw).hexdigest()
    source_label = repository_relative_label(spec_path)
    template_path = Path(__file__).resolve().parents[1] / "assets" / "templates" / "CHANGE_ATLAS.template.html"
    try:
        template = template_path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise AtlasError(f"cannot read atlas template: {template_path}") from exc

    has_owner_view = bool(sections.get("owner view", "").strip())
    values = {
        "GENERATOR_ID": html.escape(GENERATOR_ID, quote=True),
        "SOURCE_PATH_META": html.escape(source_label, quote=True),
        "SOURCE_ID": source_identity(spec_path),
        "SOURCE_SHA256": source_hash,
        "SHORT_SHA": source_hash[:12],
        "RENDERER_VERSION": RENDERER_VERSION,
        "TITLE": escaped_text(title_match.group(1)),
        "STATUS": escaped_text(status),
        "STATUS_CLASS": status,
        "SOURCE_PATH": escaped_text(source_label),
        "CONTEXT": escaped_text(context),
        "CHANGE": escaped_text(owner_view.get("change", context)),
        "BEFORE": escaped_text(
            owner_view.get("before", "not declared in this legacy spec; inspect the complete source")
        ),
        "AFTER": escaped_text(
            owner_view.get("after", "not declared in this legacy spec; inspect the complete source")
        ),
        "AUTHORITY": escaped_text(owner_view.get("authority", "the canonical Markdown spec")),
        "LEGACY_NOTE": (
            ""
            if has_owner_view
            else '<p class="legacy-note">legacy source: no owner-view section was declared.</p>'
        ),
        "SCOPE_IN": render_list(included, "no included outcomes were declared"),
        "SCOPE_OUT": render_list(excluded, "no exclusions were declared"),
        "CHANGE_SHAPE": render_change_shape(change_shape),
        "DECISIONS": render_decisions(decisions),
        "VISUALS": render_visuals(images),
        "RISKS": render_list(risks, "no risks or unknowns were declared"),
        "PROOF": render_list(proof, "no completion proof was declared"),
        "FULL_SPEC": html.escape(text, quote=False),
    }
    rendered = render_template(template, values)
    return rendered.encode("utf-8")


def existing_source_provenance(output_path: Path) -> tuple[str, str]:
    if output_path.is_symlink():
        raise AtlasError("refusing to read or replace a symbolic-link output")
    if not output_path.is_file():
        raise AtlasError(f"output exists but is not a regular file: {output_path}")
    try:
        text = output_path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise AtlasError("existing output is not a readable UTF-8 change atlas") from exc
    if f'<meta name="generator" content="{GENERATOR_ID}">' not in text:
        raise AtlasError("refusing to overwrite a file not created by this renderer")
    match = SOURCE_META_RE.search(text)
    if match is None:
        raise AtlasError("refusing to overwrite an atlas without source provenance")
    identity_match = SOURCE_ID_META_RE.search(text)
    if identity_match is None:
        raise AtlasError("refusing to overwrite an atlas without source identity")
    return html.unescape(match.group(1)), identity_match.group(1)


def atomic_write(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", prefix=f".{path.name}.", suffix=".tmp", dir=path.parent, delete=False
        ) as handle:
            temporary_name = handle.name
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, path)
    finally:
        if temporary_name is not None:
            temporary = Path(temporary_name)
            if temporary.exists():
                temporary.unlink()


def run(args: argparse.Namespace) -> int:
    spec_path = Path(args.spec).expanduser()
    output_path = Path(args.output).expanduser()
    expected = build_atlas(spec_path)
    source_label = repository_relative_label(spec_path)

    try:
        if output_path.resolve() == spec_path.resolve():
            raise AtlasError("output path must differ from the canonical spec")
    except OSError as exc:
        raise AtlasError(f"cannot resolve output path: {output_path}") from exc

    if args.check:
        if not output_path.exists():
            raise AtlasError(f"atlas output does not exist: {output_path}")
        if output_path.is_symlink() or not output_path.is_file():
            raise AtlasError("atlas output must be a regular non-symlink file")
        actual = output_path.read_bytes()
        if actual != expected:
            raise AtlasError("atlas is stale, modified, or was rendered by a different template")
        print(f"Change atlas is current: {output_path}")
        return 0

    if output_path.exists():
        bound_source, bound_identity = existing_source_provenance(output_path)
        if bound_source != source_label or bound_identity != source_identity(spec_path):
            raise AtlasError(
                f"refusing to overwrite an atlas bound to {bound_source!r} with {source_label!r}"
            )
    atomic_write(output_path, expected)
    digest = hashlib.sha256(expected).hexdigest()
    print(f"Wrote change atlas: {output_path}")
    print(f"Source: {source_label}")
    print(f"Output SHA-256: {digest}")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        return run(args)
    except (AtlasError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
