// Serverless news proxy: fetches an RSS feed server-side (browsers can't fetch
// most RSS due to CORS) and returns clean, de-duplicated, newest-first JSON.
// No API key required.
//
// Default markets feed is configurable via NEWS_RSS_URL. The Pakistan power /
// NEPRA feed (topic=energy) is configurable via NEWS_ENERGY_RSS_URL.

const DEFAULT_FEEDS = [
  "https://oilprice.com/rss/main",
  "https://www.investing.com/rss/news_301.rss", // commodities
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=CL=F,GC=F&region=US&lang=en-US",
];

// Pakistan power / NEPRA / GEPCO news (topic=energy). We merge SEVERAL Google
// News RSS searches (national power + Gujranwala-local + GEPCO) plus a direct
// Pakistani outlet feed, then sort newest-first and keep only recent items.
//
// NOTE: the `when:Nd` operator is deliberately NOT used — Google serves
// stale/cached results for those long query URLs (the reason 2-month-old items
// used to surface). We enforce freshness ourselves with parseDate + freshest().
const GNEWS = (q) =>
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent(q) +
  "&hl=en-PK&gl=PK&ceid=PK:en";

const ENERGY_FEEDS = [
  GNEWS(
    '(NEPRA OR "electricity tariff" OR "power tariff" OR "fuel cost adjustment" ' +
      'OR "fuel charges adjustment" OR "base tariff" OR "power sector" OR ' +
      'load-shedding OR "circular debt") Pakistan'
  ),
  GNEWS("Gujranwala (electricity OR power OR GEPCO OR load-shedding OR tariff OR outage)"),
  GNEWS('(GEPCO OR "Gujranwala Electric Power Company")'),
];

// Direct outlet feed (general — keyword-filtered to energy below). Adds
// resilience if Google rate-limits the datacenter IP.
const ENERGY_OUTLET_FEEDS = [
  { url: "https://propakistani.pk/feed/", source: "ProPakistani" },
];
const ENERGY_KW =
  /(electricit|power|nepra|gepco|tariff|grid|load.?shed|energy|fuel (cost|charge|price)|k-?electric|\bipp\b|disco|circular debt|solar|outage)/i;

const ENERGY_FRESH_DAYS = 30; // prefer items newer than this…
const ENERGY_MAX_DAYS = 45; // …and never show anything older than this.

const MAX_ITEMS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

export default async (req) => {
  let topic = null;
  try {
    topic = new URL(req.url).searchParams.get("topic");
  } catch {
    /* no query */
  }

  const payload = topic === "energy" ? await energyNews() : await marketsNews();

  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=900", // refresh ~15 min
    },
  });
};

export const config = { path: "/api/news" };

// Energy: merge several Pakistan power feeds, de-dupe, sort newest-first, and
// enforce freshness so stale items can never surface at the top.
async function energyNews() {
  const envFeed = env("NEWS_ENERGY_RSS_URL");
  const googleFeeds = [envFeed, ...ENERGY_FEEDS].filter(Boolean);

  const [googleGroups, outletGroups] = await Promise.all([
    Promise.all(googleFeeds.map((u) => tryFeed(u))),
    Promise.all(
      ENERGY_OUTLET_FEEDS.map((f) =>
        tryFeed(f.url).then((r) => r.map((it) => ({ ...it, _source: f.source })))
      )
    ),
  ]);

  // Google results are already topic-scoped; outlet results are general, so
  // keep only energy-relevant headlines from those.
  const google = googleGroups.flat().map(withSource);
  const outlet = outletGroups
    .flat()
    .filter((it) => ENERGY_KW.test(it.title))
    .map((it) => ({ ...withSource(it), source: it._source || null }));

  const merged = dedupe([...google, ...outlet]).sort(byDateDesc);
  const items = freshest(merged, ENERGY_FRESH_DAYS, ENERGY_MAX_DAYS).slice(0, MAX_ITEMS);
  return { items, source: "energy:merged", count: items.length };
}

// Markets: first feed that returns anything (unchanged behaviour).
async function marketsNews() {
  const configured = env("NEWS_RSS_URL");
  const feeds = configured ? [configured, ...DEFAULT_FEEDS] : DEFAULT_FEEDS;
  let usedFeed = null;
  let raw = [];
  for (const url of feeds) {
    raw = await tryFeed(url);
    if (raw.length) {
      usedFeed = url;
      break;
    }
  }
  const items = raw
    .map((it) => ({ ...it, source: null }))
    .sort(byDateDesc)
    .slice(0, MAX_ITEMS);
  return { items, source: usedFeed };
}

function env(name) {
  try {
    if (globalThis.Netlify?.env?.get) return globalThis.Netlify.env.get(name);
  } catch {
    /* not in Netlify runtime */
  }
  return process.env[name];
}

async function tryFeed(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "Mozilla/5.0 (KWM dashboard news fetcher)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml);
  } catch {
    return [];
  }
}

const parseDate = (s) => {
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
};
const byDateDesc = (a, b) => parseDate(b.date) - parseDate(a.date);

// De-duplicate by normalised title (the same story often appears across feeds).
function dedupe(items) {
  const seen = new Set();
  return items.filter((it) => {
    const key = (it.title || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Prefer items newer than `days`; if none, widen once to `capDays`; never older.
// Items without a parseable date are treated as stale and dropped — this is what
// stops 2-month-old headlines from ever reaching the top of the panel.
function freshest(items, days, capDays) {
  const within = (d) =>
    items.filter((it) => parseDate(it.date) >= Date.now() - d * DAY_MS);
  const fresh = within(days);
  return fresh.length ? fresh : within(capDays);
}

// Google News titles end with " - Source"; pull that out for display.
function withSource(it) {
  const m = it.title.match(/\s[-–]\s([^-–]{2,40})$/);
  if (m) {
    return { ...it, source: m[1].trim(), title: it.title.slice(0, m.index).trim() };
  }
  return { ...it, source: null };
}

// Minimal, dependency-free RSS/Atom parser: pulls title/link/date per item.
function parseRss(xml) {
  const blocks =
    xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ||
    xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ||
    [];
  return blocks
    .map((block) => {
      const title = clean(tag(block, "title"));
      let link = clean(tag(block, "link"));
      if (!link) {
        const m = block.match(/<link[^>]*href=["']([^"']+)["']/i);
        link = m ? m[1] : "";
      }
      const date = clean(
        tag(block, "pubDate") || tag(block, "published") || tag(block, "updated")
      );
      return { title, link, date };
    })
    .filter((it) => it.title);
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? m[1] : "";
}

function clean(s) {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}
