// Serverless proxy for the crude-oil price feed.
//
// Why this exists: free crude-oil APIs all require an API key and recommend
// server-side calls (you must not ship a key in browser code). This function
// holds the key in an env var, calls the provider, and returns a tiny CORS-safe
// JSON payload the dashboard can fetch from the browser.
//
// Provider: EIA (U.S. Energy Information Administration) — free, reliable.
//   1. Get a free key: https://www.eia.gov/opendata/register.php
//   2. Set it in Netlify: Site settings -> Environment variables -> EIA_API_KEY
//
// Series used: RBRTE = Europe Brent Spot Price FOB (USD/bbl), daily.
// If no key is configured (or the upstream call fails) we return a labelled
// fallback so the dashboard still renders.

const EIA_URL =
  "https://api.eia.gov/v2/petroleum/pri/spt/data/" +
  "?frequency=daily&data[0]=value&facets[series][]=RBRTE" +
  "&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=1";

const FALLBACK_PRICE = 78; // keep in step with BASELINES.crudeUsdBbl

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
  // Let browsers/CDN cache briefly; crude moves slowly and EIA is daily.
  "Cache-Control": "public, max-age=300",
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const key = process.env.EIA_API_KEY;
  if (!key) {
    return json(200, {
      price: FALLBACK_PRICE,
      unit: "USD/bbl",
      source: "fallback",
      note: "EIA_API_KEY not set — using baseline. See netlify/functions/crude.js.",
    });
  }

  try {
    const res = await fetch(`${EIA_URL}&api_key=${key}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`EIA ${res.status}`);
    const data = await res.json();
    const row = data?.response?.data?.[0];
    const price = row ? Number(row.value) : null;
    if (!price || Number.isNaN(price)) throw new Error("no price in response");

    return json(200, {
      price,
      unit: "USD/bbl",
      source: "EIA Brent spot (RBRTE)",
      asOf: row.period || null,
    });
  } catch (err) {
    return json(200, {
      price: FALLBACK_PRICE,
      unit: "USD/bbl",
      source: "fallback",
      note: `upstream error: ${String(err.message || err)}`,
    });
  }
}

function json(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}
