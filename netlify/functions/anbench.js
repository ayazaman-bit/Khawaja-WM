// Best-effort acrylonitrile (AN) benchmark price via server-side scrape.
//
// There is NO free real-time AN API, so this fetches a public price page and
// extracts a number. It is intentionally defensive: if anything fails it
// returns { ok: false } and the dashboard simply hides the benchmark.
//
// CONFIGURE THE SOURCE: set AN_BENCH_URL in the Netlify env to a page whose
// HTML contains the AN price (ideally in USD/MT). The default tries a couple of
// public pages, but these change often — expect to point AN_BENCH_URL at a
// source you trust. Tell us what the page shows and the parser can be tuned.

const DEFAULT_URLS = [
  "https://businessanalytiq.com/procurementanalytics/index/acrylonitrile-price-index/",
];

export default async () => {
  const configured = env("AN_BENCH_URL");
  const urls = configured ? [configured, ...DEFAULT_URLS] : DEFAULT_URLS;

  for (const url of urls) {
    const hit = await tryUrl(url);
    if (hit) {
      return json({ ok: true, ...hit, fetchedAt: new Date().toISOString() });
    }
  }
  return json({
    ok: false,
    note: "No AN benchmark parsed. Set AN_BENCH_URL to a page that shows the price in its HTML.",
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

async function tryUrl(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      headers: { "user-agent": "Mozilla/5.0 (KWM dashboard benchmark)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const price = extractUsdPerMt(html);
    if (price) return { usdMt: price, source: hostOf(url), url };
    return null;
  } catch {
    return null;
  }
}

// Look for a plausible AN price in USD/MT. AN trades roughly 700–2500 USD/MT,
// so we accept matches in that band to avoid grabbing unrelated numbers.
function extractUsdPerMt(html) {
  const text = html.replace(/\s+/g, " ");
  const patterns = [
    /(?:US?D|\$)\s*([0-9][0-9,]{2,6}(?:\.[0-9]+)?)\s*(?:\/|per\s*)?\s*(?:MT|ton|tonne|metric\s*ton)/gi,
    /([0-9][0-9,]{2,6}(?:\.[0-9]+)?)\s*(?:US?D)\s*(?:\/|per\s*)?\s*(?:MT|ton|tonne)/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const n = Number(m[1].replace(/,/g, ""));
      if (n >= 700 && n <= 2500) return n;
    }
  }
  return null;
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
      "cache-control": "public, max-age=3600", // hourly is plenty
    },
  });
}
