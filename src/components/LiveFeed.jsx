import StatCard from "./StatCard.jsx";
import { BASELINES } from "../config.js";
import { num } from "../lib/format.js";

// Grid of live market tiles derived from the snapshot.
export default function LiveFeed({ snap }) {
  if (!snap) return null;

  const change = (now, base) => ((now - base) / base) * 100;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Live Feed</h2>
        <span className="text-[11px] text-muted">
          {snap.crude.source === "fallback"
            ? "crude: baseline (set EIA_API_KEY for live)"
            : `crude: ${snap.crude.source}${
                snap.crude.asOf ? ` · ${snap.crude.asOf}` : ""
              }`}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Brent Crude"
          value={num(snap.crude.value, 2)}
          unit="USD/bbl"
          change={change(snap.crude.value, BASELINES.crudeUsdBbl)}
          live={snap.crude.live}
          tag={snap.crude.live ? "LIVE" : "EST"}
        />
        <StatCard
          label="Acrylonitrile"
          value={num(snap.an, 0)}
          unit="USD/MT"
          change={change(snap.an, BASELINES.anUsdMt)}
          live={false}
          tag={snap.anchored ? "ANCHORED" : "AUTO-CRUDE"}
        />
        <StatCard
          label="PKR / USD"
          value={num(snap.fx.value, 2)}
          unit="PKR"
          change={change(snap.fx.value, BASELINES.pkrPerUsd)}
          live={snap.fx.live}
          tag={snap.fx.live ? "LIVE" : "EST"}
        />
        <StatCard
          label="Wool (EMI)"
          value={num(snap.wool, 2)}
          unit="USD/kg"
          change={change(snap.wool, BASELINES.woolUsdKg)}
          live={false}
          tag="REF"
        />
      </div>
      <p className="mt-2 text-[11px] text-faint">
        Acrylonitrile is a crude-anchored live estimate (no free AN feed exists).
        Log a confirmed supplier price below to re-anchor it.
      </p>
    </section>
  );
}
