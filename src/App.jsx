import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Banner from "./components/Banner.jsx";
import WorldClocks from "./components/WorldClocks.jsx";
import NewsTicker from "./components/NewsTicker.jsx";
import LiveFeed from "./components/LiveFeed.jsx";
import CostPressure from "./components/CostPressure.jsx";
import AnIndex from "./components/AnIndex.jsx";
import Electricity from "./components/Electricity.jsx";
import Charts from "./components/Charts.jsx";
import NewsFeed from "./components/NewsFeed.jsx";
import CostCalculator from "./components/CostCalculator.jsx";
import {
  fetchSnapshot,
  fetchNews,
  fetchEnergyNews,
  fetchAnBenchmark,
  costPressureIndex,
} from "./lib/live.js";
import { REFRESH_MS, BASELINES, INDEX_WEIGHTS } from "./config.js";
import {
  loadAnchor,
  loadAnLog,
  saveAnLog,
  loadElecLog,
  saveElecLog,
  loadReference,
  saveReference,
  loadWeights,
  saveWeights,
  loadCalc,
  saveCalc,
} from "./lib/storage.js";

const todayISO = () => new Date().toISOString().slice(0, 10);

const DEFAULT_REFERENCE = {
  crudeUsdBbl: BASELINES.crudeUsdBbl,
  anUsdMt: BASELINES.anUsdMt,
  woolUsdKg: BASELINES.woolUsdKg,
  pkrPerUsd: BASELINES.pkrPerUsd,
  setAt: null,
};

export default function App() {
  const [snap, setSnap] = useState(null);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [inputs, setInputs] = useState(() => loadCalc());
  const [news, setNews] = useState(null); // null = loading
  const [energyNews, setEnergyNews] = useState(null); // PK power news
  const [benchmark, setBenchmark] = useState(null);
  const [elecLog, setElecLog] = useState(() => loadElecLog());
  const [reference, setReference] = useState(() => loadReference() || DEFAULT_REFERENCE);
  const [weights, setWeights] = useState(() => loadWeights() || INDEX_WEIGHTS);

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

  const applySnapshot = (s) => setSnap(s);

  // AN value the index uses: the latest confirmed price if logged, else the
  // crude-anchored estimate.
  const anForIndex =
    anLog.length ? anLog[anLog.length - 1].anUsdMt : snap?.an ?? null;

  // Cost Pressure Index, recomputed instantly when the snapshot, the user's
  // reference, or the logged AN price changes.
  const index = useMemo(() => {
    if (!snap) return 100;
    return costPressureIndex(
      {
        crude: snap.crude.value,
        an: anForIndex ?? snap.an,
        wool: snap.wool,
        fx: snap.fx.value,
      },
      reference,
      weights
    );
  }, [snap, anForIndex, reference, weights]);

  // Append each refresh's index to the sparkline history.
  useEffect(() => {
    if (snap) setHistory((h) => [...h, index].slice(-40));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap]);

  // Re-base the index reference to today's live values.
  const setReferenceToday = () => {
    if (!snap) return;
    const next = {
      crudeUsdBbl: snap.crude.value,
      anUsdMt: anForIndex ?? snap.an,
      woolUsdKg: snap.wool,
      pkrPerUsd: snap.fx.value,
      setAt: Date.now(),
    };
    setReference(next);
    saveReference(next);
  };

  // Manually edit a single reference value (budget mode).
  const updateReference = (field, value) => {
    const n = Number(value);
    if (value === "" || Number.isNaN(n) || n <= 0) return;
    const next = { ...reference, [field]: n };
    setReference(next);
    saveReference(next);
  };

  // Edit a single driver weight.
  const updateWeight = (field, value) => {
    const n = Number(value);
    if (value === "" || Number.isNaN(n) || n < 0) return;
    const next = { ...weights, [field]: n };
    setWeights(next);
    saveWeights(next);
  };

  const resetWeights = () => {
    setWeights(INDEX_WEIGHTS);
    saveWeights(INDEX_WEIGHTS);
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

  // Pakistan power / NEPRA news for the Electricity panel.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const items = await fetchEnergyNews();
      if (alive) setEnergyNews(items);
    };
    load();
    const id = setInterval(load, 30 * 60 * 1000);
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

  // ---- Electricity (GEPCO) effective rate log ----
  const addElecRate = (ratePkrKwh, date, note) => {
    const next = [
      ...elecLog,
      { ratePkrKwh, date: date || todayISO(), note: note || "" },
    ].sort((a, b) => (a.date < b.date ? -1 : 1));
    setElecLog(next);
    saveElecLog(next);
  };
  const removeElecRate = (index) => {
    const next = elecLog.filter((_, i) => i !== index);
    setElecLog(next);
    saveElecLog(next);
  };
  const elecRate = elecLog.length ? elecLog[elecLog.length - 1].ratePkrKwh : null;

  // Resolved live values handed to the calculator as fallbacks.
  const live = snap
    ? {
        anUsdMt: snap.an,
        woolUsdKg: snap.wool,
        pkrPerUsd: snap.fx.value,
        electricityPkrKwh: elecRate,
      }
    : { anUsdMt: 1450, woolUsdKg: 11.5, pkrPerUsd: 278, electricityPkrKwh: elecRate };

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
          <CostPressure
            index={index}
            history={history}
            reference={reference}
            weights={weights}
            onSetToday={setReferenceToday}
            onEditReference={updateReference}
            onEditWeight={updateWeight}
            onResetWeights={resetWeights}
          />
        </div>

        <AnIndex
          log={anLog}
          liveEstimate={snap?.an}
          benchmark={benchmark}
          onAdd={addAnPrice}
          onRemove={removeAnPrice}
        />

        <Electricity
          log={elecLog}
          news={energyNews}
          onAdd={addElecRate}
          onRemove={removeElecRate}
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
          Khawaja Woollen Mills · Market Intelligence — gold &amp; crude via Twelve
          Data, FX via ExchangeRate-API. Acrylonitrile index is built from your
          confirmed prices (plus an indicative benchmark and a crude-anchored
          estimate); figures are indicative, confirm with suppliers before committing.
        </footer>
      </main>
    </div>
  );
}
