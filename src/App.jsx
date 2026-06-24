import { useCallback, useEffect, useRef, useState } from "react";
import Banner from "./components/Banner.jsx";
import WorldClocks from "./components/WorldClocks.jsx";
import NewsTicker from "./components/NewsTicker.jsx";
import LiveFeed from "./components/LiveFeed.jsx";
import CostPressure from "./components/CostPressure.jsx";
import Charts from "./components/Charts.jsx";
import NewsFeed from "./components/NewsFeed.jsx";
import CostCalculator from "./components/CostCalculator.jsx";
import { fetchSnapshot, fetchNews } from "./lib/live.js";
import { REFRESH_MS } from "./config.js";
import {
  loadAnchor,
  saveAnchor,
  loadCalc,
  saveCalc,
} from "./lib/storage.js";

export default function App() {
  const [snap, setSnap] = useState(null);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [anchor, setAnchor] = useState(() => loadAnchor());
  const [inputs, setInputs] = useState(() => loadCalc());
  const [news, setNews] = useState(null); // null = loading
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const s = await fetchSnapshot(anchorRef.current);
      setSnap(s);
      setHistory((h) => [...h, s.index].slice(-40));
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

  // Confirm an AN price -> re-anchor the live estimate to current crude.
  const onConfirmAn = (anUsdMt) => {
    const next = {
      anUsdMt,
      crudeUsdBbl: snap?.crude?.value ?? 78,
      confirmedAt: Date.now(),
    };
    setAnchor(next);
    saveAnchor(next);
    // Recompute immediately so the feed reflects the new anchor.
    fetchSnapshot(next).then((s) => {
      setSnap(s);
      setHistory((h) => [...h, s.index].slice(-40));
    });
  };

  // Resolved live values handed to the calculator as fallbacks.
  const live = snap
    ? {
        anUsdMt: snap.an,
        woolUsdKg: snap.wool,
        pkrPerUsd: snap.fx.value,
      }
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
          Data, FX via ExchangeRate-API. Acrylonitrile is a crude-anchored
          estimate; figures are indicative, confirm with suppliers before committing.
        </footer>
      </main>
    </div>
  );
}
