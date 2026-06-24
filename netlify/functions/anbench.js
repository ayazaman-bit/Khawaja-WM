// Best-effort acrylonitrile (AN) benchmark via server-side scrape.
//
// There is NO free real-time AN API, and the accurate index is the prices you
// log in the app. This adds an *indicative* market-direction benchmark by
// scanning a public commodity list (default: SunSirs, China) for the
// "Acrylonitrile" row, reading its RMB/ton price and converting to USD/MT.
//
// It is intentionally defensive and self-diagnosing: on failure it returns
// { ok:false, tried:[...] } describing each URL's HTTP status / whether the
// keyword was found, so the source/parser can be tuned from a live test.
//
// CONFIGURE: set AN_BENCH_URL to override the page scanned.

const DEFAULT_URLS = [
  "https://www.sunsirs.com/uk/sdetail.html", // full China spot list
  "https://www.sunsirs.com/uk/sectors-14.html", // chemicals sector list
];

export default async () => {
  const configured = env("AN_BENCH_URL");
  const urls = [configured, ...DEFAULT_URLS].filter(Boolean);
  const tried = [];

  for (const url of urls) {
    const hit = await tryUrl(url, tried);
    if (hit) {
      return json({ ok: true, ...hit, fetchedAt: new Date().toISOString() });
    }
  }
  return json({
    ok: false,
    note: "No AN benchmark parsed. See 'tried' for why; set AN_BENCH_URL to a page with the price in its HTML.",
    tried,
  });
};

export const config = { path: "/api/anbench" };

function env(name) {
  try {
    if (globalThis.Netlify?.env?.get) return globalThis.Netlify.env.get(name);
  } catch {
    /* not in Netlify runtime */
  }
  return process.env[name];
}

async function tryUrl(url, tried) {
  const rec = { url, status: null, len: 0, keyword: false };
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    rec.status = res.status;
    if (!res.ok) {
      tried.push(rec);
      return null;
    }
    const html = await res.text();
    rec.len = html.length;
    const found = extractAn(html);
    rec.keyword = found.keyword;
    if (found.raw == null) {
      tried.push(rec);
      return null;
    }
    if (found.currency === "USD") {
      tried.push({ ...rec, parsed: `${found.raw} USD/MT` });
      return { usdMt: Math.round(found.raw), raw: found.raw, currency: "USD/MT", source: hostOf(url), url };
    }
    // RMB/ton -> USD/MT
    const cny = await usdToCny();
    const usdMt = Math.round(found.raw / cny);
    tried.push({ ...rec, parsed: `${found.raw} RMB/ton @ ${cny} = ${usdMt} USD/MT` });
    return {
      usdMt,
      raw: found.raw,
      currency: "CNY/ton",
      cnyPerUsd: cny,
      source: `${hostOf(url)} (China spot)`,
      url,
    };
  } catch (e) {
    rec.error = String(e.message || e);
    tried.push(rec);
    return null;
  }
}

// Find the "Acrylonitrile" row (excluding the butadiene-rubber variant) and the
// price number next to it. Strips tags first so table cells sit adjacently.
function extractAn(html) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ");
  const low = text.toLowerCase();
  let from = 0;
  let keyword = false;
  for (;;) {
    const i = low.indexOf("acrylonitrile", from);
    if (i < 0) break;
    keyword = true;
    from = i + 13;
    const ctx = low.slice(i, i + 60);
    if (ctx.includes("butadiene") || ctx.includes("rubber")) continue;
    const after = text.slice(i + 13, i + 130);
    const m = after.match(/([0-9][0-9,]{2,7}(?:\.[0-9]+)?)/);
    if (!m) continue;
    const n = Number(m[1].replace(/,/g, ""));
    if (n >= 5000 && n <= 40000) return { raw: n, currency: "CNY", keyword };
    if (n >= 700 && n <= 2500) return { raw: n, currency: "USD", keyword };
  }
  return { raw: null, keyword };
}

async function usdToCny() {
  try {
    const r = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      signal: AbortSignal.timeout(6000),
    });
    const d = await r.json();
    return d?.rates?.CNY || 7.2;
  } catch {
    return 7.2;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "benchmark";
  }
}

function json(body) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600",
    },
  });
}
