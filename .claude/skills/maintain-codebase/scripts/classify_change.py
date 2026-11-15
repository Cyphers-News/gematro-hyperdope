#!/usr/bin/env python3
"""Report an advisory green/amber/red risk floor for a repository diff.

The classifier intentionally recognizes only mechanical path and text signals.
It cannot certify safety, establish exploitability, or lower a contextual risk
classification made from the actual behavior of a system.
"""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
from pathlib import Path
import re
import subprocess
import sys
from typing import Iterable, Sequence


RISK_ORDER = {"green": 0, "amber": 1, "red": 2}

DOC_EXTENSIONS = {
    ".md",
    ".markdown",
    ".rst",
    ".txt",
}

GREEN_EXTENSIONS = DOC_EXTENSIONS | {
    ".css",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".ico",
}

CODE_EXTENSIONS = {
    ".c",
    ".cc",
    ".cpp",
    ".cs",
    ".go",
    ".html",
    ".java",
    ".js",
    ".jsx",
    ".kt",
    ".php",
    ".py",
    ".rb",
    ".rs",
    ".sh",
    ".swift",
    ".ts",
    ".tsx",
    ".vue",
}

RED_PATH_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "identity-or-privilege-path",
        re.compile(
            r"(^|/)(auth|authentication|authorization|admin|moderation|roles?|permissions?|security)([/_.-]|$)",
            re.IGNORECASE,
        ),
    ),
    (
        "money-bearing-path",
        re.compile(
            r"(^|/)(payments?|billing|wallet|bitcoin|crypto|lightning|signing)([/_.-]|$)",
            re.IGNORECASE,
        ),
    ),
    (
        "deployment-or-infrastructure-path",
        re.compile(
            r"(^|/)(deploy|deployment|infra|infrastructure|terraform|k8s|kubernetes|workflows?)([/_.-]|$)",
            re.IGNORECASE,
        ),
    ),
    (
        "database-policy-or-migration-path",
        re.compile(
            r"(^|/)(migrations?|policies|row-level-security|rls|supabase)([/_.-]|$)",
            re.IGNORECASE,
        ),
    ),
)

RED_CONTENT_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "dynamic-code-execution",
        re.compile(
            r"\beval\s*\(|\bnew\s+Function\s*\(|\bFunction\s*\(|\bset(?:Timeout|Interval)\s*\(\s*['\"]",
            re.IGNORECASE,
        ),
    ),
    (
        "html-execution-sink",
        re.compile(
            r"\.\s*(?:innerHTML|outerHTML)\s*=|\binsertAdjacentHTML\s*\(|\bdocument\.(?:write|writeln)\s*\(",
            re.IGNORECASE,
        ),
    ),
    (
        "privileged-database-definition",
        re.compile(
            r"\bSECURITY\s+DEFINER\b|\bCREATE\s+POLICY\b|\bALTER\s+TABLE\b.*\bROW\s+LEVEL\s+SECURITY\b|\bGRANT\s+(?:ALL|EXECUTE|SELECT|INSERT|UPDATE|DELETE)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "privileged-credential-reference",
        re.compile(
            r"\bservice[_-]?role\b|\bprivate[_-]?key\b|\bclient[_-]?secret\b|\bapi[_-]?secret\b",
            re.IGNORECASE,
        ),
    ),
    (
        "identity-or-role-enforcement",
        re.compile(
            r"\bauth\.uid\s*\(|\bauthori[sz]ation\b|\baccess[_-]?token\b|\brefresh[_-]?token\b|\bis[_-]?admin\b",
            re.IGNORECASE,
        ),
    ),
    (
        "money-bearing-operation",
        re.compile(
            r"\bbitcoin\b|\blightning\b|\bwallet\b|\bpayment\b|\binvoice\b|\bmacaroon\b|\bsigning[_-]?key\b",
            re.IGNORECASE,
        ),
    ),
)


@dataclass(frozen=True)
class Signal:
    risk: str
    category: str
    source: str


@dataclass(frozen=True)
class Classification:
    risk_floor: str
    paths: tuple[str, ...]
    signals: tuple[Signal, ...]
    limitations: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "risk_floor": self.risk_floor,
            "paths": list(self.paths),
            "signals": [asdict(signal) for signal in self.signals],
            "limitations": list(self.limitations),
            "advisory": True,
        }


def _normalize_paths(paths: Iterable[str]) -> tuple[str, ...]:
    normalized = {path.strip().replace("\\", "/") for path in paths if path.strip()}
    return tuple(sorted(normalized))


def _is_document(path: str) -> bool:
    return Path(path).suffix.lower() in DOC_EXTENSIONS


def _path_signals(path: str) -> list[Signal]:
    lower = path.lower()
    suffix = Path(lower).suffix

    if lower.endswith(".env") or "/.env." in lower or suffix in {".pem", ".key", ".p12"}:
        return [Signal("red", "credential-bearing-path", path)]

    if suffix == ".sql":
        return [Signal("red", "database-change", path)]

    if lower.startswith(".github/workflows/") or lower.endswith("dockerfile"):
        return [Signal("red", "deployment-or-infrastructure-path", path)]

    if not _is_document(path):
        for category, pattern in RED_PATH_PATTERNS:
            if pattern.search(lower):
                return [Signal("red", category, path)]

    if suffix in GREEN_EXTENSIONS:
        return [Signal("green", "presentational-or-document-path", path)]

    if suffix in CODE_EXTENSIONS:
        return [Signal("amber", "runtime-code-path", path)]

    if Path(lower).name in {
        "package.json",
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "pyproject.toml",
        "requirements.txt",
        "cargo.toml",
        "go.mod",
    }:
        return [Signal("amber", "dependency-or-build-path", path)]

    return [Signal("amber", "unclassified-path", path)]


def _split_diff(diff_text: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {}
    current = "<unattributed-diff>"
    sections[current] = []

    for line in diff_text.splitlines():
        if line.startswith("diff --git "):
            match = re.match(r"diff --git a/(.+?) b/(.+)$", line)
            current = match.group(2) if match else "<unattributed-diff>"
            sections.setdefault(current, [])
            continue
        if line.startswith("+++ b/"):
            current = line[6:]
            sections.setdefault(current, [])
            continue
        if line.startswith(("+++ ", "--- ", "@@")):
            continue
        if line.startswith(("+", "-")):
            sections.setdefault(current, []).append(line[1:])

    return {path: "\n".join(lines) for path, lines in sections.items() if lines}


def classify(paths: Iterable[str], diff_text: str = "") -> Classification:
    normalized = _normalize_paths(paths)
    signals: list[Signal] = []
    limitations: list[str] = [
        "Pattern matches require contextual review and do not establish a vulnerability.",
        "Deployed configuration, external state, generated code, and ignored files may be absent.",
    ]

    for path in normalized:
        signals.extend(_path_signals(path))

    diff_sections = _split_diff(diff_text)
    for path, content in diff_sections.items():
        if path != "<unattributed-diff>" and _is_document(path):
            continue
        for category, pattern in RED_CONTENT_PATTERNS:
            if pattern.search(content):
                signals.append(Signal("red", category, path))

    if not normalized and not diff_sections:
        signals.append(Signal("amber", "insufficient-change-evidence", "<none>"))
        limitations.append("No changed paths or diff content were available.")

    deduped = tuple(
        sorted(
            set(signals),
            key=lambda item: (-RISK_ORDER[item.risk], item.category, item.source),
        )
    )
    floor = max(deduped, key=lambda item: RISK_ORDER[item.risk]).risk

    return Classification(
        risk_floor=floor,
        paths=normalized,
        signals=deduped,
        limitations=tuple(limitations),
    )


def _run_git(repo: Path, arguments: Sequence[str]) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *arguments],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        message = result.stderr.strip() or "git command failed"
        raise RuntimeError(message)
    return result.stdout


def collect_git_change(repo: Path, base: str | None, staged: bool) -> tuple[list[str], str, list[str]]:
    if staged:
        diff_args = ["diff", "--cached", "--no-ext-diff", "--unified=0", "--"]
        names_args = ["diff", "--cached", "--name-only", "-z", "--"]
    elif base:
        diff_args = ["diff", "--no-ext-diff", "--unified=0", base, "--"]
        names_args = ["diff", "--name-only", "-z", base, "--"]
    else:
        diff_args = ["diff", "--no-ext-diff", "--unified=0", "HEAD", "--"]
        names_args = ["diff", "--name-only", "-z", "HEAD", "--"]

    diff_text = _run_git(repo, diff_args)
    paths = [path for path in _run_git(repo, names_args).split("\0") if path]

    status = _run_git(repo, ["status", "--porcelain=v1", "-z", "--untracked-files=all"])
    untracked: list[str] = []
    entries = status.split("\0")
    index = 0
    while index < len(entries):
        entry = entries[index]
        index += 1
        if not entry:
            continue
        code = entry[:2]
        path = entry[3:]
        if code == "??":
            paths.append(path)
            untracked.append(path)
        elif code[0] in {"R", "C"} and index < len(entries):
            index += 1

    return paths, diff_text, untracked


def _format_text(result: Classification) -> str:
    lines = [f"risk_floor: {result.risk_floor}"]
    lines.append(f"paths: {len(result.paths)}")
    lines.append("signals:")
    for signal in result.signals:
        lines.append(f"  - [{signal.risk}] {signal.category}: {signal.source}")
    lines.append("limitations:")
    for limitation in result.limitations:
        lines.append(f"  - {limitation}")
    lines.append("advisory: true; this result may raise risk and cannot certify safety")
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, help="Git repository to inspect")
    parser.add_argument("--base", help="Compare the repository against this revision")
    parser.add_argument("--staged", action="store_true", help="Inspect staged changes only")
    parser.add_argument("--paths", nargs="*", default=[], help="Changed paths supplied directly")
    parser.add_argument("--diff-file", type=Path, help="Unified diff to inspect")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    paths = list(args.paths)
    diff_text = ""
    limitations: list[str] = []

    if args.repo:
        try:
            git_paths, git_diff, untracked = collect_git_change(
                args.repo.resolve(), args.base, args.staged
            )
        except RuntimeError as error:
            print(f"error: unable to inspect git change: {error}", file=sys.stderr)
            return 2
        paths.extend(git_paths)
        diff_text += git_diff
        if untracked:
            limitations.append(
                "Untracked file contents were not scanned: " + ", ".join(sorted(untracked))
            )

    if args.diff_file:
        diff_text += args.diff_file.read_text(encoding="utf-8")

    result = classify(paths, diff_text)
    if limitations:
        result = Classification(
            risk_floor=result.risk_floor,
            paths=result.paths,
            signals=result.signals,
            limitations=result.limitations + tuple(limitations),
        )

    if args.format == "json":
        print(json.dumps(result.to_dict(), indent=2, sort_keys=True))
    else:
        print(_format_text(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
