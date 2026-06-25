// Serverless news proxy: fetches a markets/commodities RSS feed server-side
// (browsers can't fetch most RSS due to CORS) and returns clean JSON for the
// dashboard's news panel. No API key required.
//
// The feed is configurable: set NEWS_RSS_URL in the Netlify env to point at any
// RSS/Atom feed you prefer (e.g. an oil, textile or Pakistan-business feed).
// Otherwise a few sensible defaults are tried in order until one works.

const DEFAULT_FEEDS = [
  "https://oilprice.com/rss/main",
  "https://www.investing.com/rss/news_301.rss", // commodities
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=CL=F,GC=F&region=US&lang=en-US",
];

// Pakistan power / NEPRA news (topic=energy). Google News RSS is reliable and
// server-fetchable; overridable via NEWS_ENERGY_RSS_URL.
const ENERGY_FEEDS = [
  "https://news.google.com/rss/search?q=" +
    encodeURIComponent("Pakistan electricity tariff OR NEPRA OR power") +
    "&hl=en-PK&gl=PK&ceid=PK:en",
];

export default async (req) => {
  let topic = null;
  try {
    topic = new URL(req.url).searchParams.get("topic");
  } catch {
    /* no query */
  }

  const feeds =
    topic === "energy"
      ? [env("NEWS_ENERGY_RSS_URL"), ...ENERGY_FEEDS].filter(Boolean)
      : (() => {
          const configured = env("NEWS_RSS_URL");
          return configured ? [configured, ...DEFAULT_FEEDS] : DEFAULT_FEEDS;
        })();

  let items = [];
  let usedFeed = null;
  for (const url of feeds) {
    items = await tryFeed(url);
    if (items.length) {
      usedFeed = url;
      break;
    }
  }

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
    return parseRss(xml).slice(0, 12);
  } catch {
    return [];
  }
}

// Minimal, dependency-free RSS/Atom parser: pulls title/link/date per item.
function parseRss(xml) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ||
    xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks
    .map((block) => {
      const title = clean(tag(block, "title"));
      let link = clean(tag(block, "link"));
      // Atom uses <link href="..."/>.
      if (!link) {
        const m = block.match(/<link[^>]*href=["']([^"']+)["']/i);
        link = m ? m[1] : "";
      }
      const date = clean(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated"));
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
