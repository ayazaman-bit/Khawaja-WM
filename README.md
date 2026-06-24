# Khawaja Woolen Mills — Market Intelligence Dashboard

A live dashboard for **Khawaja Woolen Mills (KWM)** that shows real-time cost
signals for acrylic yarn production and lets you enter your own costs manually to
get an estimated **final cost** and **suggested sell price**.

This is now an **editable React + Vite source project** (rebuilt from the
original compiled bundle), with a small serverless backend for live crude-oil
prices.

## Features

- **Khawaja Woolen Mills banner** with a live/offline status indicator.
- **Live Feed**
  - **PKR/USD** exchange rate — live from ExchangeRate-API (browser, no key).
  - **Brent crude** — live from the **EIA** (U.S. Energy Information
    Administration) via a serverless proxy that keeps the API key server-side.
  - **Acrylonitrile (AN)** — a **crude-anchored estimate** (there is no free
    live AN feed; AN tracks crude). You can log a confirmed supplier price to
    re-anchor it.
  - **Cost Pressure Index** — a weighted crude · AN · wool · FX gauge with a
    **HIGH PRESSURE** alarm banner.
- **Yarn Cost Calculator** — enter your own costs (AN price, electricity,
  labour, margin, blend, etc.). Any field you leave blank falls back to the live
  feed or to mill defaults, so you always get a full **Estimated Cost Breakdown**,
  a **cost of production (PKR/kg)** and a **suggested sell price**.
- Confirmed prices and calculator inputs **persist** in the browser.

## Live data sources

| Signal | Source | Key needed? |
|---|---|---|
| PKR/USD | `api.exchangerate-api.com` (client-side) | No |
| Brent crude | EIA via `netlify/functions/crude.js` | Yes — free `EIA_API_KEY` |
| Acrylonitrile | Estimated from crude (`AN_MODEL` in `src/config.js`) | — |
| Wool (EMI) | Reference baseline (no free feed) | — |

### Why crude is proxied (and AN isn't a direct feed)

Free crude APIs all require an API key and must be called server-side — you must
never ship a key in browser code. So `netlify/functions/crude.js` holds the key
and returns a CORS-safe JSON the front-end can fetch at `/api/crude`. There is no
free acrylonitrile API at all, so AN is modelled off crude and refined whenever
you log a confirmed supplier price.

## Get the EIA key (free)

1. Register: https://www.eia.gov/opendata/register.php (instant, no card).
2. **Local:** copy `.env.example` to `.env` and set `EIA_API_KEY=...`.
3. **Netlify:** Site settings → Environment variables → add `EIA_API_KEY`.

Without a key the app still runs — crude shows a labelled baseline value.

## Develop

```bash
npm install

# Front-end only (crude falls back to baseline; FX is live):
npm run dev            # http://localhost:5173

# Full stack incl. the crude proxy function (needs the Netlify CLI + .env):
npm install -g netlify-cli
npm run netlify-dev    # http://localhost:8888
```

## Build & deploy (Netlify)

```bash
npm run build          # outputs dist/
```

Connect this repo to **Netlify** — `netlify.toml` is already configured:

- build command `npm run build`, publish `dist`
- functions in `netlify/functions`
- `/api/crude` routed to the crude function, plus SPA fallback

Set `EIA_API_KEY` in the Netlify environment and deploy. (Any static host works
for the front-end, but the live crude feed needs a host that runs the function —
Netlify Functions, or an equivalent serverless platform.)

## Tuning the model

Everything lives in **`src/config.js`** — baselines, the AN-from-crude
elasticity, Cost Pressure Index weights, the alarm threshold, and the calculator
defaults. Adjust these to match your mill and market reference.

## Project layout

```
index.html                  Vite entry
src/
  main.jsx, App.jsx         App shell + state/refresh wiring
  config.js                 Baselines, model + calculator defaults
  lib/
    live.js                 FX + crude fetch, AN model, pressure index
    costModel.js            Yarn cost breakdown + suggested sell price
    storage.js, format.js   Persistence + formatting helpers
  components/               Banner, LiveFeed, CostPressure, CostCalculator, …
netlify/functions/crude.js  EIA crude-oil proxy (key server-side, CORS)
netlify.toml, public/_redirects   Deploy + routing config
```

> Figures are indicative — confirm with suppliers before committing to prices.
