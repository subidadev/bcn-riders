#!/usr/bin/env python3
"""Stamp local CSS/JS references in index.html with a content hash (?v=abc123).

GitHub Pages tells browsers to cache files for 10 minutes, so without this a
returning visitor can keep running an old app.js after a deploy. Run it before
committing whenever a CSS/JS/data file changes:

    python3 scripts/bust_cache.py
"""
import hashlib
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
REF = re.compile(r'((?:href|src)=")((?:assets|data)/[^"?]+\.(?:css|js))(?:\?v=[0-9a-f]+)?(")')


def stamp(m):
    path = ROOT / m.group(2)
    digest = hashlib.sha1(path.read_bytes()).hexdigest()[:8]
    return f"{m.group(1)}{m.group(2)}?v={digest}{m.group(3)}"


html = INDEX.read_text()
new = REF.sub(stamp, html)
if new != html:
    INDEX.write_text(new)
for ref in REF.finditer(new):
    print(ref.group(2))
