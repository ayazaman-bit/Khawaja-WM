import StatCard from "./StatCard.jsx";
import { BASELINES } from "../config.js";
import { num } from "../lib/format.js";

// Grid of live market tiles derived from the snapshot.
export default function LiveFeed({ snap }) {
  if (!snap) return null;

  const change = (now, base) => ((now - base) / base) * 100;
  const src = (s) =>
    s.source === "fallback" ? "baseline" : `${s.source}${s.asOf ? ` · ${s.asOf}` : ""}`;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Live Feed</h2>
        <span className="text-[11px] text-muted">
          {snap.crude.source === "fallback" && snap.gold.source === "fallback"
            ? "set MARKETS_API_KEY for live gold & oil"
            : `crude: ${src(snap.crude)}`}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="Brent Crude"
          value={num(snap.crude.value, 2)}
          unit="USD/bbl"
          change={change(snap.crude.value, BASELINES.crudeUsdBbl)}
          live={snap.crude.live}
          tag={snap.crude.live ? "LIVE" : "EST"}
        />
        <StatCard
          label="Gold"
          value={num(snap.gold.value, 0)}
          unit="USD/oz"
          change={change(snap.gold.value, BASELINES.goldUsdOz)}
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
          label="PKR / GBP"
          value={num(snap.fxGbp.value, 2)}
          unit="PKR"
          change={change(snap.fxGbp.value, BASELINES.pkrPerGbp)}
          live={snap.fxGbp.live}
          tag={snap.fxGbp.live ? "LIVE" : "EST"}
        />
      </div>
      <p className="mt-2 text-[11px] text-faint">
        Acrylonitrile is a crude-anchored live estimate (no free AN feed exists).
        Log a confirmed supplier price below to re-anchor it. Gold shown in
        USD/oz with PKR/tola conversion at the live rate.
      </p>
    </section>
  );
}
