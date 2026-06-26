// Scrolling headline ticker across the top. Pauses on hover. Items are passed
// in from App (shared with the Markets News panel — one fetch for both).
export default function NewsTicker({ items, label = "MARKETS" }) {
  if (!items || items.length === 0) return null;

  // Duplicate the list so the CSS marquee can loop seamlessly (-50% shift).
  const loop = [...items, ...items];

  return (
    <div className="border-b border-border bg-card/70 overflow-hidden">
      <div className="mx-auto max-w-7xl flex items-stretch">
        <span className="shrink-0 bg-danger/15 text-danger text-[11px] font-semibold px-3 py-1.5 flex items-center gap-1.5">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-danger" />
          {label}
        </span>
        <div className="overflow-hidden flex-1">
          <div className="ticker-track py-1.5">
            {loop.map((it, i) => (
              <a
                key={i}
                href={it.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted hover:text-ink px-5 inline-flex items-center gap-2"
              >
                <span className="text-faint">•</span>
                {it.title}
                {it.source && <span className="text-faint">({it.source})</span>}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
