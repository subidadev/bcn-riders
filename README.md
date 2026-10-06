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

The Socks tier (€30) has no payment link yet. Add it to `TIERS.socks.url` and the button
switches on.

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

The club map draws the routes with Leaflet over [OpenTopoMap](https://opentopomap.org) tiles
(CC-BY-SA, attribution shown on the map, no API key). Route photos load from
`https://ridewithgps.com/photos/{highlighted_photo_id}/medium.jpg`; set a highlighted photo on
a route in Ride with GPS and re-run the script to show it. `FEATURED` in the script pins routes
to the top of the list and `DEFAULT_ROUTE` is the route opened on desktop at page load.

## Assets

Kit photos, logo and the beach-club illustration are from the 2027 kit flyer and the
Obbi design book.
