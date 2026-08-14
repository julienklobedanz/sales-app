#!/usr/bin/env python3
"""T1 mechanical palette → token swap. Mapping is exactly design-system.md §7."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Five rows from §7. Do not add fallbacks.
REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\btext-(?:slate|gray|zinc)-(?:700|800|900|950)\b"), "text-foreground"),
    (re.compile(r"\btext-(?:slate|gray|zinc)-(?:300|400|500|600)\b"), "text-muted-foreground"),
    (re.compile(r"\bbg-(?:slate|gray)-50\b"), "bg-muted"),
    (re.compile(r"\bbg-(?:slate|gray|zinc)-(?:100|200)\b"), "bg-accent"),
    (re.compile(r"\bborder-(?:slate|gray|zinc)-(?:100|200|300)\b"), "border-border"),
]

# Dark inversions and specials — script must not touch these token names.
FORBIDDEN_AFTER = (
    "bg-slate-800",
    "bg-slate-900",
    "bg-slate-950",
    "bg-zinc-950",
    "text-slate-100",
    "text-slate-200",
    "border-slate-800",
    "ring-slate-950",
    "shadow-slate-900",
    "decoration-gray-400",
)


def apply(text: str) -> str:
    out = text
    for pat, repl in REPLACEMENTS:
        out = pat.sub(repl, out)
    return out


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: t1-neutral-tokens.py <file>...", file=sys.stderr)
        return 2
    changed = 0
    for raw in sys.argv[1:]:
        path = Path(raw)
        if not path.is_absolute():
            path = ROOT / raw
        original = path.read_text(encoding="utf-8")
        updated = apply(original)
        if updated == original:
            print(f"unchanged {path.relative_to(ROOT)}")
            continue
        # Guard: inversions/specials must still be present if they were
        for token in FORBIDDEN_AFTER:
            before = original.count(token)
            after = updated.count(token)
            if before != after:
                print(
                    f"ERROR {path}: {token} count {before} → {after}",
                    file=sys.stderr,
                )
                return 1
        path.write_text(updated, encoding="utf-8")
        print(f"updated  {path.relative_to(ROOT)}")
        changed += 1
    print(f"{changed} files written")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
