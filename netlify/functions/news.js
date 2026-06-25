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

// Pakistan power / NEPRA / GEPCO news (topic=energy). Google News RSS search,
// scoped to Pakistan (gl=PK) and to the last 30 days (when:30d) so results stay
// fresh and come from Pakistani outlets (Dawn, Business Recorder, ProPakistani,
// Tribune, The News, etc.).
const ENERGY_QUERY =
  '(NEPRA OR GEPCO OR "electricity tariff" OR "power tariff" OR ' +
  '"fuel charges adjustment" OR "base tariff" OR "electricity price") Pakistan when:30d';
const ENERGY_FEEDS = [
  "https://news.google.com/rss/search?q=" +
    encodeURIComponent(ENERGY_QUERY) +
    "&hl=en-PK&gl=PK&ceid=PK:en",
];

const MAX_ITEMS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

export default async (req) => {
  let topic = null;
  try {
    topic = new URL(req.url).searchParams.get("topic");
  } catch {
    /* no query */
  }

  const isEnergy = topic === "energy";
  const feeds = isEnergy
    ? [env("NEWS_ENERGY_RSS_URL"), ...ENERGY_FEEDS].filter(Boolean)
    : (() => {
        const configured = env("NEWS_RSS_URL");
        return configured ? [configured, ...DEFAULT_FEEDS] : DEFAULT_FEEDS;
      })();

  let raw = [];
  let usedFeed = null;
  for (const url of feeds) {
    raw = await tryFeed(url);
    if (raw.length) {
      usedFeed = url;
      break;
    }
  }

  // Clean up: split off the " - Source" suffix, sort newest-first, and for the
  // energy feed drop anything older than 45 days (defensive against stale hits).
  let items = raw
    .map((it) => (isEnergy ? withSource(it) : { ...it, source: null }))
    .sort(byDateDesc);
  if (isEnergy) items = recent(items, 45);
  items = items.slice(0, MAX_ITEMS);

  return new Response(JSON.stringify({ items, source: usedFeed }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=900", // refresh ~15 min
    },
  });
};

export const config = { path: "/api/news" };

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

// Keep items within `days`; if that leaves nothing (e.g. dates unparseable),
// fall back to the unfiltered list rather than showing an empty panel.
function recent(items, days) {
  const cutoff = Date.now() - days * DAY_MS;
  const fresh = items.filter((it) => parseDate(it.date) >= cutoff);
  return fresh.length ? fresh : items;
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
