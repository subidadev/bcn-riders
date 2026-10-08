# BCN Riders · 2027 membership site

Static site for the BCN Riders (Barcelona Cycling Network) 2027 membership renewal drive:
kit tiers, an order form that hands off to Revolut checkout, a size guide, and a map of the club's
Ride with GPS routes.

## Run locally

```bash
python3 -m http.server 8427
```

Then open http://localhost:8427. There's no build step; it's plain HTML, CSS and JS.

## How ordering works

Each tier links to a Revolut payment link (set in `assets/js/app.js`, `TIERS`).
Revolut payment links have one required free-text field (*"2027 BCN Riders team kit and
membership!"*, max 100 chars) and **can't be prefilled from the URL**. So the form
builds an order line like:

```
Ana Garcia · SPORT · Jersey/Vest M · Bibs L · Socks M
```

It copies that line to the clipboard when the rider taps pay. The rider pastes it into
the Revolut field, and it shows up on the payment in Revolut Business.

## Refresh routes

Routes come from the [Ride with GPS club](https://ridewithgps.com/organizations/8423-barcelona-cycling-network):

```bash
python3 scripts/update_routes.py
```

This rewrites `data/routes.js` with every public club route: stats, surface, a simplified line
(Douglas-Peucker, 25 m, stored as an encoded polyline) and a 120-point elevation profile. Route
JSON is cached in `scripts/.cache/` (gitignored) keyed by each route's `updated_at`, so re-runs
only fetch what changed; add `--fresh` to refetch everything. It fetches 3 routes at a time and
retries dropped connections; if any route still fails, `data/routes.js` is left untouched.
Only route fields are kept, never owner names or other personal details.

Then render the route card thumbnails (needs Pillow, `pip install pillow`):

```bash
python3 scripts/route_thumbs.py
```

This draws each route in club colours over the OpenTopoMap base map into
`assets/img/routes/{id}.jpg` and writes `data/thumbs.js` (id → content hash, for cache-busting).
Map tiles are cached in `scripts/.cache/tiles/`, so re-runs only fetch new areas, gently. A route
without a thumbnail falls back to its line drawn on a plain background. The thumbnails are
CC-BY-SA derivatives of OpenTopoMap; the credit sits under the route list.

The club map draws the routes with Leaflet over [OpenTopoMap](https://opentopomap.org) tiles
(CC-BY-SA, attribution shown on the map, no API key). Route photos load from
`https://ridewithgps.com/photos/{highlighted_photo_id}/medium.jpg`; set a highlighted photo on
a route in Ride with GPS and re-run the script to show it. `FEATURED` in the script pins routes
to the top of the list and `DEFAULT_ROUTE` is the route opened on desktop at page load.

## Deploying

Push to `main` and GitHub Pages redeploys. Before committing a change to any CSS, JS or
`data/routes.js` file, run:

```bash
python3 scripts/bust_cache.py
```

It stamps those references in `index.html` with a content hash (`app.js?v=…`), so visitors
get the new files right away instead of a copy cached for up to 10 minutes.

## Order notifications

Every "Copy & pay" (and "Copy") on the order form is sent to a Google Apps Script web app,
`scripts/order-log/Code.gs`, which adds a row to a Google Sheet (time, build, name, sizes, order
line, site) and emails the organiser. Logging is off while `ORDER_LOG_URL` in `assets/js/app.js`
is empty. Rows are attempts, not payments: match them against Revolut by the order line.

One-time setup:

1. Create a Google Sheet, e.g. "BCN Riders orders 2027".
2. Extensions → Apps Script. Replace the starter code with `scripts/order-log/Code.gs` and save.
   Set `NOTIFY_EMAIL` if the emails should go somewhere other than your own account.
3. Choose `setup` in the toolbar and Run it. Approve the permissions (it's your own script, so
   Google warns it isn't verified: Advanced → Go to the project). An "Attempts" tab appears.
4. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone. Deploy and copy
   the URL ending in `/exec`.
5. Put that URL in `ORDER_LOG_URL`, run `python3 scripts/bust_cache.py`, commit and publish.

After editing the script later: Deploy → Manage deployments → Edit → New version (the URL
stays the same). The script ignores repeat clicks within a minute, drops unknown builds and
sizes, and logs at most 30 rows per 10 minutes.

## Assets

Site icons: the beach umbrella. `assets/img/favicon-umbrella.ico` (16/32/48/64) and
`assets/img/favicon-umbrella-64.png` are the sources; `favicon.ico` and `favicon.png` at the root are
copies of them (Tiiny rewrites the icon link to `/favicon.png`, so it must ship with every publish).
`assets/img/apple-touch-icon.png` is the 180px home-screen icon. `assets/img/share.png` is the
200×200 link-preview image ("Order your kit"). Tiiny serves its preview image from `/og-image.png`;
when publishing to Tiiny, add a copy of `share.png` named `og-image.png` at the root of the upload
and it replaces whatever was set in the Tiiny dashboard.

Kit photos, logo and the beach-club illustration are from the 2027 kit flyer and the
Obbi design book.
