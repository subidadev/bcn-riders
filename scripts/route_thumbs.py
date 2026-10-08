#!/usr/bin/env python3
"""Render a map thumbnail for every club route into assets/img/routes/{id}.jpg.

Usage:  python3 scripts/route_thumbs.py        (run after scripts/update_routes.py)
Needs Pillow (pip install pillow).

Each thumbnail is the OpenTopoMap base map, toned down like the big club map,
with the route drawn on top in club colours. Tiles are cached in
scripts/.cache/tiles/ so re-runs only fetch what's new. Also writes
data/thumbs.js (route id -> content hash) so the site can cache-bust and fall
back to a plain line drawing for any route without a thumbnail.
"""
import hashlib
import io
import json
import math
import pathlib
import time
import urllib.error
import urllib.request

from PIL import Image, ImageDraw, ImageEnhance

ROOT = pathlib.Path(__file__).resolve().parent.parent
ROUTES_JS = ROOT / "data" / "routes.js"
THUMBS_JS = ROOT / "data" / "thumbs.js"
OUT_DIR = ROOT / "assets" / "img" / "routes"
TILE_CACHE = ROOT / "scripts" / ".cache" / "tiles"
TILE_URL = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
UA = "bcn-riders-site route thumbnails (https://github.com/subidadev/bcn-riders)"

W, H = 800, 252          # 2x the card's ~400x126 display size
PAD = 26                 # space around the route, in output pixels
MIN_Z, MAX_Z = 5, 15
SS = 2                   # supersampling for smooth route lines
# Keep in sync with KIND_COLOR / CASING in assets/js/app.js
KIND_COLOR = {"road": "#2f43a6", "gravel": "#a9cbe8", "mtb": "#ffffff", "other": "#c9dff2"}
CASING, WHITE = "#1b2a44", "#ffffff"


def load_routes():
    for line in ROUTES_JS.read_text().splitlines():
        if line.startswith("window.BCN_ROUTES = "):
            return json.loads(line[len("window.BCN_ROUTES = "):].rstrip(";"))
    raise SystemExit("data/routes.js has no BCN_ROUTES; run scripts/update_routes.py first")


def decode(s):
    """Google encoded polyline -> [(lat, lng), ...]."""
    out, i, lat, lng = [], 0, 0, 0
    while i < len(s):
        for k in (0, 1):
            shift = res = 0
            while True:
                b = ord(s[i]) - 63
                i += 1
                res |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            d = ~(res >> 1) if res & 1 else res >> 1
            if k == 0:
                lat += d
            else:
                lng += d
        out.append((lat / 1e5, lng / 1e5))
    return out


def world_px(lat, lng, z):
    n = 256 * 2 ** z
    r = math.radians(lat)
    return (lng + 180) / 360 * n, (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n


def tile(z, x, y):
    path = TILE_CACHE / str(z) / str(x) / f"{y}.png"
    if not path.exists():
        url = TILE_URL.format(s="abc"[(x + y) % 3], z=z, x=x, y=y)
        for attempt in range(5):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = resp.read()
                break
            except (urllib.error.URLError, ConnectionError, TimeoutError):
                if attempt == 4:
                    raise
                time.sleep(2 ** attempt)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        time.sleep(0.15)  # be gentle with OpenTopoMap's volunteer servers
    return Image.open(path).convert("RGB")


def render(route):
    pts = decode(route["line"])
    if len(pts) < 2:
        return None
    # Highest zoom where the whole route fits inside the thumbnail
    for z in range(MAX_Z, MIN_Z - 1, -1):
        xy = [world_px(lat, lng, z) for lat, lng in pts]
        xs, ys = [p[0] for p in xy], [p[1] for p in xy]
        if max(xs) - min(xs) <= W - 2 * PAD and max(ys) - min(ys) <= H - 2 * PAD:
            break
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    left, top = cx - W / 2, cy - H / 2

    base = Image.new("RGB", (W, H), "#e6f0fa")
    for tx in range(math.floor(left / 256), math.floor((left + W - 1) / 256) + 1):
        for ty in range(math.floor(top / 256), math.floor((top + H - 1) / 256) + 1):
            if 0 <= ty < 2 ** z:
                base.paste(tile(z, tx % 2 ** z, ty), (round(tx * 256 - left), round(ty * 256 - top)))
    # Same tone as the big map's CSS filter: saturate(.45) contrast(.92) brightness(1.08)
    base = ImageEnhance.Color(base).enhance(0.45)
    base = ImageEnhance.Contrast(base).enhance(0.92)
    base = ImageEnhance.Brightness(base).enhance(1.08)

    over = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    line = [((x - left) * SS, (y - top) * SS) for x, y in xy]
    d.line(line, fill=CASING, width=14 * SS, joint="curve")
    d.line(line, fill=KIND_COLOR.get(route["kind"], KIND_COLOR["road"]), width=7 * SS, joint="curve")
    for x, y in (line[0], line[-1]):  # round the line ends
        for col, r in ((CASING, 7), (KIND_COLOR.get(route["kind"], KIND_COLOR["road"]), 3.5)):
            d.ellipse((x - r * SS, y - r * SS, x + r * SS, y + r * SS), fill=col)
    if route["type"] != "loop":
        ex, ey = line[-1]
        d.ellipse((ex - 11 * SS, ey - 11 * SS, ex + 11 * SS, ey + 11 * SS), fill=WHITE)
        d.ellipse((ex - 8 * SS, ey - 8 * SS, ex + 8 * SS, ey + 8 * SS), fill=CASING)
    sx, sy = line[0]
    d.ellipse((sx - 11 * SS, sy - 11 * SS, sx + 11 * SS, sy + 11 * SS), fill=CASING)
    d.ellipse((sx - 7 * SS, sy - 7 * SS, sx + 7 * SS, sy + 7 * SS), fill=WHITE)
    base.paste(over.resize((W, H), Image.LANCZOS), (0, 0), over.resize((W, H), Image.LANCZOS))

    buf = io.BytesIO()
    base.save(buf, "JPEG", quality=74, optimize=True, progressive=True)
    return buf.getvalue()


def main():
    routes = load_routes()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    hashes, total = {}, 0
    for i, r in enumerate(routes, 1):
        data = render(r)
        if data:
            (OUT_DIR / f"{r['id']}.jpg").write_bytes(data)
            hashes[r["id"]] = hashlib.sha1(data).hexdigest()[:8]
            total += len(data)
        print(f"\r{i}/{len(routes)} thumbnails", end="", flush=True)
    print()
    keep = {f"{rid}.jpg" for rid in hashes}
    for old in OUT_DIR.glob("*.jpg"):
        if old.name not in keep:
            old.unlink()
    THUMBS_JS.write_text(
        "// Generated by scripts/route_thumbs.py. Do not edit by hand.\n"
        "window.BCN_THUMBS = " + json.dumps({str(k): v for k, v in hashes.items()}, separators=(",", ":")) + ";\n"
    )
    print(f"Wrote {len(hashes)} thumbnails ({total // 1024} KB) to {OUT_DIR}")


if __name__ == "__main__":
    main()
