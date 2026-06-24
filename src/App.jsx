import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Banner from "./components/Banner.jsx";
import WorldClocks from "./components/WorldClocks.jsx";
import NewsTicker from "./components/NewsTicker.jsx";
import LiveFeed from "./components/LiveFeed.jsx";
import CostPressure from "./components/CostPressure.jsx";
import AnIndex from "./components/AnIndex.jsx";
import Charts from "./components/Charts.jsx";
import NewsFeed from "./components/NewsFeed.jsx";
import CostCalculator from "./components/CostCalculator.jsx";
import { fetchSnapshot, fetchNews, fetchAnBenchmark } from "./lib/live.js";
import { REFRESH_MS, BASELINES } from "./config.js";
import {
  loadAnchor,
  loadAnLog,
  saveAnLog,
  loadCalc,
  saveCalc,
} from "./lib/storage.js";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [snap, setSnap] = useState(null);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [inputs, setInputs] = useState(() => loadCalc());
  const [news, setNews] = useState(null); // null = loading
  const [benchmark, setBenchmark] = useState(null);

  // Confirmed AN prices (ascending by date). Migrate any legacy single anchor.
  const [anLog, setAnLog] = useState(() => {
    const log = loadAnLog();
    if (log.length) return log;
    const legacy = loadAnchor();
    if (legacy?.anUsdMt) {
      return [
        {
          anUsdMt: legacy.anUsdMt,
          crudeUsdBbl: legacy.crudeUsdBbl ?? BASELINES.crudeUsdBbl,
          date: new Date(legacy.confirmedAt || Date.now())
            .toISOString()
            .slice(0, 10),
          note: "migrated",
        },
      ];
    }
    return [];
  });

  // The model anchors to the most recent confirmed price.
  const anchor = useMemo(() => {
    if (!anLog.length) return null;
    const last = anLog[anLog.length - 1];
    return {
      anUsdMt: last.anUsdMt,
      crudeUsdBbl: last.crudeUsdBbl,
      confirmedAt: last.date,
    };
  }, [anLog]);
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;

  const applySnapshot = (s) => {
    setSnap(s);
    setHistory((h) => [...h, s.index].slice(-40));
  };

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      applySnapshot(await fetchSnapshot(anchorRef.current));
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Initial load + auto-refresh timer.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Persist calculator inputs.
  useEffect(() => {
    saveCalc(inputs);
  }, [inputs]);

  // Markets news for the ticker + panel (one fetch, refreshed every 15 min).
  useEffect(() => {
    let alive = true;
    const loadNews = async () => {
      const items = await fetchNews();
      if (alive) setNews(items);
    };
    loadNews();
    const id = setInterval(loadNews, 15 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // AN market benchmark (best-effort), refreshed hourly.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const b = await fetchAnBenchmark();
      if (alive) setBenchmark(b);
    };
    load();
    const id = setInterval(load, 60 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Add / remove confirmed AN prices, then re-anchor the live estimate.
  const persistLog = (updated) => {
    setAnLog(updated);
    saveAnLog(updated);
    const last = updated[updated.length - 1];
    const nextAnchor = last
      ? { anUsdMt: last.anUsdMt, crudeUsdBbl: last.crudeUsdBbl, confirmedAt: last.date }
      : null;
    fetchSnapshot(nextAnchor).then(applySnapshot);
  };

  const addAnPrice = (anUsdMt, date, note) => {
    const entry = {
      anUsdMt,
      crudeUsdBbl: snap?.crude?.value ?? BASELINES.crudeUsdBbl,
      date: date || todayISO(),
      note: note || "",
    };
    persistLog([...anLog, entry].sort((a, b) => (a.date < b.date ? -1 : 1)));
  };

  const removeAnPrice = (index) =>
    persistLog(anLog.filter((_, i) => i !== index));

  // The calculator's "confirm" button logs today's price.
  const onConfirmAn = (anUsdMt) => addAnPrice(anUsdMt, todayISO(), "from calculator");

  // Resolved live values handed to the calculator as fallbacks.
  const live = snap
    ? { anUsdMt: snap.an, woolUsdKg: snap.wool, pkrPerUsd: snap.fx.value }
    : { anUsdMt: 1450, woolUsdKg: 11.5, pkrPerUsd: 278 };

  const anyLive = !!(snap && (snap.fx.live || snap.crude.live));

  return (
    <div className="min-h-full">
      <Banner
        lastUpdated={snap?.at}
        anyLive={anyLive}
        onRefresh={refresh}
        refreshing={refreshing}
      />
      <WorldClocks />
      <NewsTicker items={news} />

      <main className="mx-auto max-w-7xl px-4 py-5 space-y-5">
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <LiveFeed snap={snap} />
          </div>
          <CostPressure index={snap?.index ?? 100} history={history} />
        </div>

        <AnIndex
          log={anLog}
          liveEstimate={snap?.an}
          benchmark={benchmark}
          onAdd={addAnPrice}
          onRemove={removeAnPrice}
        />

        <Charts snap={snap} />

        <div className="grid lg:grid-cols-3 gap-5 items-stretch">
          <div className="lg:col-span-2">
            <CostCalculator
              live={live}
              inputs={inputs}
              setInputs={setInputs}
              onConfirmAn={onConfirmAn}
              anchor={anchor}
            />
          </div>
          <NewsFeed items={news} />
        </div>

        <footer className="text-[11px] text-faint text-center pt-2 pb-6">
          Khawaja Woolen Mills · Market Intelligence — gold &amp; crude via Twelve
          Data, FX via ExchangeRate-API. Acrylonitrile index is built from your
          confirmed prices (plus an indicative benchmark and a crude-anchored
          estimate); figures are indicative, confirm with suppliers before committing.
        </footer>
      </main>
    </div>
  );
}
