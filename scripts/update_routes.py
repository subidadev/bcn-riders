#!/usr/bin/env python3
"""Refresh data/routes.js from the BCN Riders club on Ride with GPS.

Usage:  python3 scripts/update_routes.py
Pulls every public club route, simplifies its track for the club map, samples an
elevation profile, and writes a small JS file (window.BCN_ROUTES = [...]) so the
site works as plain static files, including when opened straight from disk.

Route JSON is cached in scripts/.cache/ (gitignored) so a re-run only fetches
what changed. Pass --fresh to ignore the cache.
"""
import json
import math
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

CLUB_ID = 8423
LIST_URL = f"https://ridewithgps.com/clubs/{CLUB_ID}/routes.json?limit=500"
ROUTE_URL = "https://ridewithgps.com/routes/{}.json"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "routes.js"
CACHE = ROOT / "scripts" / ".cache"

# Route selected on the map when the page loads.
DEFAULT_ROUTE = 48302922  # GRVL Heaven & Hell Loop
TOLERANCE_M = 25          # track simplification tolerance (metres)
PROFILE_SAMPLES = 120     # elevation profile points per route
WORKERS = 3               # parallel route fetches; RWGPS resets connections above ~8
RETRIES = 5

# Routes pinned to the top of the list under "Newest first".
FEATURED = [51156160, 51156224, 48302922, 48302809]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "bcn-riders-site"})
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or attempt == RETRIES - 1:
                raise
        except (urllib.error.URLError, ConnectionError, TimeoutError, json.JSONDecodeError):
            if attempt == RETRIES - 1:
                raise
        time.sleep(2 ** attempt)  # 1, 2, 4, 8 s


def route_json(r, fresh):
    """Full route JSON, cached on disk and keyed by the route's updated_at."""
    path = CACHE / f"{r['id']}.json"
    if not fresh and path.exists():
        cached = json.loads(path.read_text())
        if cached.get("_updated_at") == r.get("updated_at"):
            return cached
    d = get(ROUTE_URL.format(r["id"]))
    d = d.get("route", d)
    # Keep only what we use, so the cache never holds owner details
    keep = {k: d.get(k) for k in ("highlighted_photo_id", "surface")}
    keep["track_points"] = [{k: t.get(k) for k in "xyed"} for t in d.get("track_points") or []]
    keep["_updated_at"] = r.get("updated_at")
    CACHE.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(keep, separators=(",", ":")))
    return keep


def encode(points):
    """Google encoded polyline for [(lat, lng), ...] at 1e-5 precision."""
    out, plat, plng = [], 0, 0
    for lat, lng in points:
        ilat, ilng = round(lat * 1e5), round(lng * 1e5)
        for v in (ilat - plat, ilng - plng):
            v = ~(v << 1) if v < 0 else v << 1
            while v >= 0x20:
                out.append(chr((0x20 | (v & 0x1F)) + 63))
                v >>= 5
            out.append(chr(v + 63))
        plat, plng = ilat, ilng
    return "".join(out)


def classify(r):
    name = r["name"].lower()
    unpaved = r.get("unpaved_pct") or 0
    if "hike" in name:
        return "other"
    if "mtb" in name:
        return "mtb"
    if re.search(r"\broad\b", name):
        return "road"
    if "grvl" in name or "gravel" in name or "traka" in name or unpaved >= 30:
        return "gravel"
    return "road" if unpaved < 15 else "gravel"


def simplify(pts, tol_m):
    """Douglas-Peucker on (lng, lat) points, tolerance in metres."""
    if len(pts) < 3:
        return pts
    lat0 = math.radians(sum(p[1] for p in pts) / len(pts))
    kx, ky = 111320 * math.cos(lat0), 110540
    xy = [(p[0] * kx, p[1] * ky) for p in pts]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = xy[a], xy[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1e-9
        best, idx = 0, None
        for i in range(a + 1, b):
            px, py = xy[i]
            d = abs(dy * (px - ax) - dx * (py - ay)) / L
            if d > best:
                best, idx = d, i
        if idx is not None and best > tol_m:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def profile(track, n):
    pts = [(t["d"], t["e"]) for t in track if t.get("d") is not None and t.get("e") is not None]
    if len(pts) < 2:
        return []
    total = pts[-1][0]
    out, j = [], 0
    for k in range(n):
        target = total * k / (n - 1)
        while j < len(pts) - 1 and pts[j + 1][0] < target:
            j += 1
        out.append(round(pts[j][1]))
    return out


def detail(r, fresh=False):
    d = route_json(r, fresh)
    track = [t for t in d["track_points"] if t.get("x") is not None and t.get("y") is not None]
    line = simplify([(t["x"], t["y"]) for t in track], TOLERANCE_M)
    return {
        "id": r["id"],
        "name": r["name"].strip(),
        "km": round(r["distance"] / 1000, 1),
        "gain": round(r.get("elevation_gain") or 0),
        "unpaved": max(r.get("unpaved_pct") or 0, 0),
        "start": (r.get("locality") or "").strip(),
        "type": "loop" if r.get("track_type") == "loop" else "point to point",
        "kind": classify(r),
        "created": r["created_at"][:10],
        "featured": r["id"] in FEATURED,
        "surface": (d.get("surface") or "unknown").replace("_", " "),
        "photo": d.get("highlighted_photo_id") or None,
        "line": encode([(y, x) for x, y in line]),
        "ele": profile(track, PROFILE_SAMPLES),
    }


def main():
    listing = get(LIST_URL)["results"]
    listing = [r for r in listing
               if r.get("visibility") == 0 and not r.get("deleted_at") and not r.get("archived_at")]
    fresh = "--fresh" in sys.argv
    routes, failed = [], []

    def one(r):
        try:
            return detail(r, fresh)
        except Exception as e:  # report and carry on; checked below
            failed.append((r["id"], repr(e)))

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for i, out in enumerate(pool.map(one, listing), 1):
            if out:
                routes.append(out)
            print(f"\r{i}/{len(listing)} routes", end="", flush=True)
    print()
    if failed:
        for rid, err in failed:
            print(f"  failed {rid}: {err}", file=sys.stderr)
        sys.exit(f"{len(failed)} route(s) failed; data/routes.js left unchanged. Re-run to retry.")
    routes.sort(key=lambda x: x["created"], reverse=True)

    OUT.write_text(
        "// Generated by scripts/update_routes.py. Do not edit by hand.\n"
        f"window.BCN_CLUB_ID = {CLUB_ID};\n"
        f"window.BCN_DEFAULT_ROUTE = {DEFAULT_ROUTE};\n"
        "window.BCN_ROUTES = " + json.dumps(routes, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    photos = sum(1 for r in routes if r["photo"])
    print(f"Wrote {len(routes)} routes ({photos} with photos, {OUT.stat().st_size // 1024} KB) to {OUT}")


if __name__ == "__main__":
    main()
