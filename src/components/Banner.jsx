import { timeAgo } from "../lib/format.js";

// Top banner: mill name + live status. The pulsing dot signals the feed is on.
export default function Banner({ lastUpdated, anyLive, onRefresh, refreshing }) {
  return (
    <header className="border-b border-border bg-panel/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/logo-mark.png"
            alt="Khawaja Woollen Mills logo"
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div className="leading-tight">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight">
              Khawaja Woollen Mills
            </h1>
            <p className="text-xs text-muted">
              Real-time cost signals for acrylic yarn production
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`live-dot inline-block h-2 w-2 rounded-full ${
                anyLive ? "bg-good" : "bg-faint"
              }`}
            />
            <span className="text-muted">
              {anyLive ? "LIVE" : "OFFLINE"} · updated {timeAgo(lastUpdated)}
            </span>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="text-xs px-3 py-1.5 rounded-md border border-border bg-card hover:bg-border/60 disabled:opacity-50 transition"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
    </header>
  );
}
