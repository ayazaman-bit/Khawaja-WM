# Khawaja Woolen Mills — Market Intelligence Dashboard

A live dashboard for **Khawaja Woolen Mills (KWM)** showing real-time cost
signals for acrylic yarn production, plus a manual cost calculator so you can
work out an estimated final cost and suggested sell price.

The site is a self-contained static web app (pre-built). There is no server to
run — just open it or deploy the files in this repo.

## What's in the dashboard

- **Khawaja Woolen Mills banner** across the top.
- **Live Feed** — live PKR/kg production cost, exchange rates (USD base, via
  `api.exchangerate-api.com`), acrylonitrile / crude-anchored commodity signals
  and an all-commodities **Cost Pressure Index**. Shows a "Last updated"
  timestamp and refreshes automatically.
- **Yarn Cost Calculator** — enter your own confirmed costs manually
  (e.g. a confirmed acrylonitrile/supplier price, target margin). Any field you
  leave empty falls back to the live feed value, so you always get a complete
  **Estimated Cost Breakdown** and a **suggested sell price**. Each confirmed
  price you log re-anchors the live dashboard estimate.

## Running locally

It's a static site, so any static file server works:

```bash
# Python (built in)
python3 -m http.server 8080
# then open http://localhost:8080
```

> Note: open it through a server (not by double-clicking `index.html`), because
> the app loads its assets from absolute `/assets/...` paths.

## Deploying

The repo is ready to deploy to any static host. It's pre-configured for
**Netlify**:

- `netlify.toml` publishes the repo root.
- `_redirects` provides the single-page-app fallback to `index.html`.

On Netlify, connect this repository (or drag-and-drop the folder) and deploy —
no build command needed. The same files also work on Vercel, Cloudflare Pages,
GitHub Pages (at a domain root) or any static host.

## Project layout

```
index.html                 App entry point
assets/index-*.js          Application bundle (React)
assets/index-*.css         Styles
_redirects                 SPA routing fallback (Netlify)
netlify.toml               Netlify deploy config
```
