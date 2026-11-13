#!/usr/bin/env python3
"""Check universal repository-continuity documentation invariants.

This checker intentionally handles only structured, repository-independent
facts. Project-specific semantics belong in project-owned tests.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from urllib.parse import unquote, urlparse


CORE_DOCUMENTS = ("README.md", "AGENTS.md", "STATUS.md")
CLOSE_RESIDUE_BASENAMES = {"verification.md"}
ALLOWED_STATUS_HEADINGS = frozenset(
    {
        "Verified checkpoint",
        "Working now",
        "Incomplete or broken",
        "Active work",
        "Next useful action",
        "Re-entry notes",
    }
)
STATUS_HEADING_PATTERN = re.compile(r"^##[ \t]+(.+?)\s*$", re.MULTILINE)
IGNORED_PARTS = {
    ".git",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".tox",
    ".venv",
    "build",
    "dist",
    "node_modules",
    "vendor",
}
VALID_SPEC_STATUSES = {"draft", "accepted", "retired", "rejected"}
PLACEHOLDER_PATTERNS = (
    (re.compile(r"\{\{[^{}\n]+\}\}"), "unresolved template placeholder"),
    (re.compile(r"\bTODO\(verify\)", re.IGNORECASE), "unresolved verification marker"),
    (re.compile(r"\[TODO(?::|\])", re.IGNORECASE), "unresolved TODO marker"),
)
LINK_PATTERN = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
SPEC_STATUS_PATTERN = re.compile(
    r"^\s*status:\s*([a-z-]+)\s*(?:<!--.*-->)?\s*$", re.IGNORECASE | re.MULTILINE
)
LAST_VERIFIED_PATTERN = re.compile(
    r"(?:\*\*)?last[ -]verified\s*:\s*(?:\*\*)?\s*(\d{4}-\d{2}-\d{2})",
    re.IGNORECASE,
)
STRONG_CLAIM_PATTERN = re.compile(
    r"\b(always|never|exact|exactly|current|currently|future|canonical)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Finding:
    level: str
    path: str
    line: int | None
    message: str

    def render(self) -> str:
        location = self.path if self.line is None else f"{self.path}:{self.line}"
        return f"[{self.level}] {location} — {self.message}"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check repository-independent documentation continuity invariants (structure, freshness, close residue)."
    )
    parser.add_argument(
        "repository",
        nargs="?",
        default=".",
        help="repository root to check (default: current directory)",
    )
    parser.add_argument(
        "--require",
        action="append",
        default=[],
        metavar="PATH",
        help="require an additional repository-relative document; repeat as needed",
    )
    parser.add_argument(
        "--no-core",
        action="store_true",
        help="do not require README.md, AGENTS.md, and STATUS.md",
    )
    parser.add_argument(
        "--max-status-age",
        type=int,
        default=45,
        metavar="DAYS",
        help="warn when STATUS.md is older than this many days; negative disables",
    )
    parser.add_argument(
        "--review-claims",
        action="store_true",
        help="list strong prose claims for human review without failing the check",
    )
    return parser.parse_args(argv)


def is_scannable_markdown(path: Path, root: Path) -> bool:
    relative = path.relative_to(root)
    if path.name.endswith(".template.md"):
        return False
    if "tests" in relative.parts and "fixtures" in relative.parts:
        return False
    return not any(part in IGNORED_PARTS for part in relative.parts)


def read_markdown(root: Path) -> tuple[dict[Path, str], list[Finding]]:
    documents: dict[Path, str] = {}
    findings: list[Finding] = []
    for path in sorted(root.rglob("*.md")):
        if not is_scannable_markdown(path, root):
            continue
        try:
            documents[path] = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            findings.append(
                Finding("ERROR", str(path.relative_to(root)), None, f"cannot read Markdown: {exc}")
            )
    return documents, findings


def line_number(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def check_required(root: Path, required: list[str]) -> list[Finding]:
    findings: list[Finding] = []
    for raw_path in dict.fromkeys(required):
        path = root / raw_path
        if not path.is_file():
            findings.append(Finding("ERROR", raw_path, None, "required document is missing"))
    return findings


def check_placeholders(root: Path, documents: dict[Path, str]) -> list[Finding]:
    findings: list[Finding] = []
    for path, text in documents.items():
        relative = str(path.relative_to(root))
        for pattern, message in PLACEHOLDER_PATTERNS:
            for match in pattern.finditer(text):
                findings.append(
                    Finding("ERROR", relative, line_number(text, match.start()), message)
                )
    return findings


def normalize_link_target(raw_target: str) -> str | None:
    target = raw_target.strip()
    if target.startswith("<") and ">" in target:
        target = target[1 : target.index(">")]
    else:
        target = target.split(maxsplit=1)[0]

    target = unquote(target)
    if not target or target.startswith(("#", "/", "//")):
        return None
    parsed = urlparse(target)
    if parsed.scheme:
        return None
    return target.split("#", 1)[0]


def check_links(root: Path, documents: dict[Path, str]) -> list[Finding]:
    findings: list[Finding] = []
    for path, text in documents.items():
        relative = str(path.relative_to(root))
        for match in LINK_PATTERN.finditer(text):
            target = normalize_link_target(match.group(1))
            if target is None or "{{" in target:
                continue
            resolved = path.parent / target
            if not resolved.exists():
                findings.append(
                    Finding(
                        "ERROR",
                        relative,
                        line_number(text, match.start()),
                        f"local Markdown target does not exist: {target}",
                    )
                )
    return findings


def check_specs(root: Path, documents: dict[Path, str]) -> list[Finding]:
    findings: list[Finding] = []
    for path, text in documents.items():
        relative_path = path.relative_to(root)
        if "specs" not in relative_path.parts:
            continue
        match = SPEC_STATUS_PATTERN.search("\n".join(text.splitlines()[:25]))
        relative = str(relative_path)
        if match is None:
            findings.append(Finding("ERROR", relative, None, "spec has no status line"))
            continue
        status = match.group(1).lower()
        if status not in VALID_SPEC_STATUSES:
            allowed = ", ".join(sorted(VALID_SPEC_STATUSES))
            findings.append(
                Finding(
                    "ERROR",
                    relative,
                    line_number(text, match.start()),
                    f"invalid spec status {status!r}; expected one of: {allowed}",
                )
            )
    return findings


def check_front_door(root: Path, documents: dict[Path, str]) -> list[Finding]:
    readme = root / "README.md"
    text = documents.get(readme)
    if text is None:
        return []

    findings: list[Finding] = []
    for name in ("AGENTS.md", "STATUS.md"):
        if name not in text:
            findings.append(
                Finding("WARN", "README.md", None, f"front door does not name {name}")
            )
    return findings


def check_close_residue(root: Path, documents: dict[Path, str]) -> list[Finding]:
    findings: list[Finding] = []
    for path in documents:
        if path.name.lower() in CLOSE_RESIDUE_BASENAMES:
            findings.append(
                Finding(
                    "WARN",
                    str(path.relative_to(root)),
                    None,
                    "VERIFICATION.md is not a model document; STATUS.md owns the checkpoint",
                )
            )
    return findings


def check_status_shape(root: Path, documents: dict[Path, str]) -> list[Finding]:
    status_path = root / "STATUS.md"
    text = documents.get(status_path)
    if text is None:
        return []

    findings: list[Finding] = []
    fence_blocks = text.count("```") // 2
    if fence_blocks > 2:
        findings.append(
            Finding(
                "WARN",
                "STATUS.md",
                None,
                f"STATUS snapshot has {fence_blocks} fenced blocks; record commands and one result, not a session transcript",
            )
        )
    headings = [match.group(1).strip() for match in STATUS_HEADING_PATTERN.finditer(text)]
    checkpoint_count = headings.count("Verified checkpoint")
    if checkpoint_count > 1:
        findings.append(
            Finding(
                "WARN",
                "STATUS.md",
                None,
                f"extra Verified checkpoint section ({checkpoint_count} found); STATUS is a snapshot",
            )
        )
    seen: set[str] = set()
    for heading in headings:
        if heading in ALLOWED_STATUS_HEADINGS or heading in seen:
            seen.add(heading)
            continue
        seen.add(heading)
        findings.append(
            Finding(
                "WARN",
                "STATUS.md",
                None,
                f"unexpected STATUS heading {heading!r}; STATUS is a snapshot using the template sections",
            )
        )
    return findings


def check_status_age(root: Path, documents: dict[Path, str], max_age: int) -> list[Finding]:
    if max_age < 0:
        return []
    status_path = root / "STATUS.md"
    text = documents.get(status_path)
    if text is None:
        return []

    match = LAST_VERIFIED_PATTERN.search(text)
    if match is None:
        return [Finding("WARN", "STATUS.md", None, "no YYYY-MM-DD last-verified date found")]

    try:
        verified = datetime.strptime(match.group(1), "%Y-%m-%d").date()
    except ValueError:
        return [Finding("ERROR", "STATUS.md", None, "last-verified date is invalid")]

    age = (date.today() - verified).days
    if age < 0:
        return [Finding("WARN", "STATUS.md", None, "last-verified date is in the future")]
    if age > max_age:
        return [
            Finding(
                "WARN",
                "STATUS.md",
                None,
                f"last verified {age} days ago (threshold: {max_age})",
            )
        ]
    return []


def collect_strong_claims(root: Path, documents: dict[Path, str]) -> list[Finding]:
    findings: list[Finding] = []
    for path, text in documents.items():
        relative = str(path.relative_to(root))
        for number, raw_line in enumerate(text.splitlines(), start=1):
            if STRONG_CLAIM_PATTERN.search(raw_line):
                excerpt = " ".join(raw_line.strip().split())
                if len(excerpt) > 140:
                    excerpt = excerpt[:137] + "..."
                findings.append(
                    Finding("REVIEW", relative, number, f"verify strong claim: {excerpt}")
                )
    return findings


def run(args: argparse.Namespace) -> tuple[list[Finding], int]:
    root = Path(args.repository).expanduser().resolve()
    if not root.is_dir():
        finding = Finding("ERROR", str(root), None, "repository path is not a directory")
        return [finding], 1

    required = list(args.require)
    if not args.no_core:
        required = [*CORE_DOCUMENTS, *required]

    documents, findings = read_markdown(root)
    findings.extend(check_required(root, required))
    findings.extend(check_placeholders(root, documents))
    findings.extend(check_links(root, documents))
    findings.extend(check_specs(root, documents))
    findings.extend(check_front_door(root, documents))
    findings.extend(check_close_residue(root, documents))
    findings.extend(check_status_shape(root, documents))
    findings.extend(check_status_age(root, documents, args.max_status_age))
    if args.review_claims:
        findings.extend(collect_strong_claims(root, documents))

    level_order = {"ERROR": 0, "WARN": 1, "REVIEW": 2}
    findings.sort(key=lambda item: (level_order[item.level], item.path, item.line or 0, item.message))
    exit_code = 1 if any(item.level == "ERROR" for item in findings) else 0
    return findings, exit_code


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    findings, exit_code = run(args)
    for finding in findings:
        print(finding.render())

    errors = sum(item.level == "ERROR" for item in findings)
    warnings = sum(item.level == "WARN" for item in findings)
    reviews = sum(item.level == "REVIEW" for item in findings)
    print(f"Checked documentation: {errors} error(s), {warnings} warning(s), {reviews} review item(s).")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
