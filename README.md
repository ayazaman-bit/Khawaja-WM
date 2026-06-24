# Khawaja Woollen Mills — Market Intelligence Dashboard

A live dashboard for **Khawaja Woollen Mills (KWM)** that shows real-time cost
signals for acrylic yarn production and lets you enter your own costs manually to
get an estimated **final cost** and **suggested sell price**.

This is an **editable React + Vite source project** (rebuilt from the original
compiled bundle), with a small serverless backend for live market prices. **No
login is ever required for visitors** — it's a public web page.

## Features

- **Khawaja Woollen Mills banner** with a live/offline status indicator.
- **World clocks** — live Karachi / London / New York times.
- **Live Feed** (watchlist tiles)
  - **Gold** — USD/oz with **PKR/tola** and **PKR/10g** conversion at the live rate.
  - **Brent crude** — live, the macro driver behind acrylic.
  - **Acrylonitrile (AN)** — see the **AN Price Index** below.
  - **Currencies** — live **PKR/USD, PKR/GBP, PKR/EUR, PKR/AED**, no key.
  - **Cost Pressure Index** — a weighted crude · AN · wool · FX gauge with a
    **HIGH PRESSURE** alarm banner.
- **Acrylonitrile Price Index** — there is **no free live AN feed anywhere**, so
  the accurate index is built from the **confirmed prices you log** (price +
  date + supplier note), shown as a real trend chart with latest/average. It's
  shown alongside an **indicative market benchmark** (a best-effort scrape of a
  public page, configured via `AN_BENCH_URL`) and the crude-anchored model
  estimate. Each logged price re-anchors that estimate.
- **30-day trend charts** — area charts for crude, gold and the AN estimate.
- **Markets News** — a scrolling headline **ticker** plus a news panel, both fed
  by live oil/gold/commodities RSS (via a serverless proxy), to support
  buying/pricing decisions.
- **Yarn Cost Calculator** — two modes:
  - **Per kg** — enter your own costs (AN price, electricity, labour, margin,
    blend) plus **your own expense lines** (packaging, freight, dyeing, rent…).
    Get a full **Estimated Cost Breakdown**, **cost of production (PKR/kg)** and
    **suggested sell price**. Empty fields fall back to the live feed or mill
    defaults.
  - **Per order** — enter a quantity (kg) to get **total cost** and **order
    price** for quoting customers.
- Confirmed prices and calculator inputs **persist** in the browser.

## Live data sources

| Signal | Source | Key needed? |
|---|---|---|
| Gold (USD/oz → PKR/tola) | Twelve Data via `netlify/functions/markets.js` | Yes — free `MARKETS_API_KEY` |
| Brent crude | Twelve Data (or EIA if `EIA_API_KEY` set) | Yes — same `MARKETS_API_KEY` |
| PKR/USD, PKR/GBP | `api.exchangerate-api.com` (client-side) | No |
| Acrylonitrile (index) | Prices you log in-app (most accurate) | No |
| Acrylonitrile (benchmark) | Scrape via `netlify/functions/anbench.js` (`AN_BENCH_URL`) | No |
| Acrylonitrile (estimate) | Modelled from crude (`AN_MODEL` in `src/config.js`) | — |
| Wool (EMI) | Reference baseline (no free feed) | — |
| Markets news | RSS via `netlify/functions/news.js` (configurable `NEWS_RSS_URL`) | No |

### Why gold/crude are proxied (and AN isn't a direct feed)

Free gold/oil APIs all require an API key and must be called server-side — you
must never ship a key in browser code. So `netlify/functions/markets.js` holds
**one** key, fetches gold + crude, and returns a CORS-safe JSON the browser
fetches at `/api/markets`. There is no free acrylonitrile API at all, so AN is
modelled off crude and sharpened whenever you log a confirmed supplier price.

## Get the API key (free, one key)

**Twelve Data** covers gold + crude on its free plan:

1. Sign up: https://twelvedata.com/pricing (free plan, instant key).
2. **Local:** copy `.env.example` to `.env` and set `MARKETS_API_KEY=...`.
3. **Netlify:** Site settings → Environment variables → add `MARKETS_API_KEY`.

Optional: also set `EIA_API_KEY` (https://www.eia.gov/opendata/register.php) to
source crude from the US government feed instead — extra reliability.

Without any key the app still runs — gold & crude show labelled baseline values.

> If gold or crude ever show as "baseline" despite a key, the provider's ticker
> symbol may differ — check/adjust `SYMBOLS` at the top of
> `netlify/functions/markets.js` against twelvedata.com/exchanges/COMMODITY.

## Develop

```bash
npm install

# Front-end only (gold/crude fall back to baseline; FX is live):
npm run dev            # http://localhost:5173

# Full stack incl. the market proxy function (needs the Netlify CLI + .env):
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
- `/api/markets` routed to the markets function, plus SPA fallback

Set `MARKETS_API_KEY` in the Netlify environment and deploy. (Any static host
works for the front-end, but the live gold/crude feed needs a host that runs the
function — Netlify Functions, or an equivalent serverless platform.)

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
    live.js                 FX + gold/crude fetch, gold units, AN model, index
    costModel.js            Cost breakdown, expenses, per-kg & per-order totals
    storage.js, format.js   Persistence + formatting helpers
  components/               Banner, LiveFeed, CostPressure, CostCalculator, …
netlify/functions/markets.js  Gold + crude proxy (one key server-side, CORS)
netlify.toml, public/_redirects   Deploy + routing config
```

> Figures are indicative — confirm with suppliers before committing to prices.
