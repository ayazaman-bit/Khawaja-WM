// Static accent map (kept literal so Tailwind doesn't purge the classes).
const ACCENTS = {
  danger: { chip: "bg-danger/15 text-danger", dot: "bg-danger" },
  brand: { chip: "bg-brand/15 text-brand", dot: "bg-brand" },
};

// Scrolling headline ticker. Pauses on hover. Used full-bleed at the top
// (default) and inline as a section card mid-page (inline). Items come from App.
export default function NewsTicker({ items, label = "MARKETS", accent = "danger", inline = false }) {
  if (!items || items.length === 0) return null;

  const a = ACCENTS[accent] || ACCENTS.danger;

  // Duplicate the list so the CSS marquee can loop seamlessly (-50% shift).
  const loop = [...items, ...items];

  return (
    <div
      className={
        inline
          ? "rounded-xl border border-border bg-card overflow-hidden"
          : "border-b border-border bg-card/70 overflow-hidden"
      }
    >
      <div className="mx-auto max-w-7xl flex items-stretch">
        <span
          className={`shrink-0 ${a.chip} text-[11px] font-semibold px-3 py-1.5 flex items-center gap-1.5`}
        >
          <span className={`live-dot inline-block h-1.5 w-1.5 rounded-full ${a.dot}`} />
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
