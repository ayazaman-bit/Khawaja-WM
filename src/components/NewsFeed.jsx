import { useEffect, useState } from "react";
import { fetchNews } from "../lib/live.js";

const NEWS_REFRESH_MS = 15 * 60 * 1000;

// Markets / commodities news to support decisions. Headlines come from the
// /api/news serverless proxy (RSS -> JSON).
export default function NewsFeed() {
  const [items, setItems] = useState(null); // null = loading
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const news = await fetchNews();
      if (!alive) return;
      setItems(news);
      setUpdated(Date.now());
    };
    load();
    const id = setInterval(load, NEWS_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="rounded-xl border border-border bg-card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-danger" />
          Markets News
        </h2>
        <span className="text-[11px] text-faint">oil · gold · commodities</span>
      </div>

      {items === null && (
        <div className="text-[11px] text-faint">loading headlines…</div>
      )}

      {items !== null && items.length === 0 && (
        <div className="text-[11px] text-faint">
          News feed unavailable right now. (You can set a different RSS source via
          the <span className="mono">NEWS_RSS_URL</span> env variable.)
        </div>
      )}

      <ul className="space-y-2.5 overflow-auto pr-1">
        {(items || []).map((it, i) => (
          <li key={i} className="border-b border-border/60 pb-2.5 last:border-0">
            <a
              href={it.link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ink hover:text-brand leading-snug block"
            >
              {it.title}
            </a>
            {it.date && (
              <span className="text-[10px] text-faint">{shortDate(it.date)}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function shortDate(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
