import StatCard from "./StatCard.jsx";
import { num } from "../lib/format.js";

// Grid of live market tiles derived from the snapshot.
export default function LiveFeed({ snap }) {
  if (!snap) return null;

  const src = (s) =>
    s.source === "fallback" ? "baseline" : `${s.source}${s.asOf ? ` · ${s.asOf}` : ""}`;

  const fx = snap.fxAll;
  const currencies = [
    { label: "PKR / USD", o: fx.usd },
    { label: "PKR / GBP", o: fx.gbp },
    { label: "PKR / EUR", o: fx.eur },
    { label: "PKR / Yuan", o: fx.cny },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Live Feed</h2>
        <span className="text-[11px] text-muted">
          {snap.crude.source === "fallback" && snap.gold.source === "fallback"
            ? "set MARKETS_API_KEY for live gold"
            : `crude: ${src(snap.crude)}`}
        </span>
      </div>

      {/* Commodities */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-faint mb-2">
          Commodities
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Brent Crude"
            value={num(snap.crude.value, 2)}
            unit="USD/bbl"
            live={snap.crude.live}
            tag={snap.crude.live ? "LIVE" : "EST"}
          />
          <StatCard
            label="WTI Crude"
            value={num(snap.wti.value, 2)}
            unit="USD/bbl"
            live={snap.wti.live}
            tag={snap.wti.live ? "LIVE" : "EST"}
          />
          <StatCard
            label="Gold"
            value={num(snap.gold.value, 0)}
            unit="USD/oz"
            live={snap.gold.live}
            tag={snap.gold.live ? "LIVE" : "EST"}
            subtext={`Rs ${num(snap.gold.local.pkrPerTola, 0)}/tola · Rs ${num(
              snap.gold.local.pkrPer10g,
              0
            )}/10g`}
          />
          <StatCard
            label="Acrylonitrile"
            value={num(snap.an, 0)}
            unit="USD/MT"
            live={false}
            tag={snap.anchored ? "ANCHORED" : "AUTO-CRUDE"}
          />
        </div>
      </div>

      {/* Currencies */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-faint mb-2">
          Currencies (PKR)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {currencies.map((c) => (
            <StatCard
              key={c.label}
              label={c.label}
              value={num(c.o.value, 2)}
              unit="PKR"
              live={c.o.live}
              tag={c.o.live ? "LIVE" : "EST"}
            />
          ))}
        </div>
      </div>

      <p className="text-[11px] text-faint">
        Acrylonitrile is a crude-anchored estimate (no free AN feed exists); log a
        confirmed supplier price below to re-anchor it. Gold shown in USD/oz with
        PKR/tola conversion at the live rate.
      </p>
    </section>
  );
}
