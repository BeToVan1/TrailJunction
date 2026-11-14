import { useEffect, useState } from "react";
import {
  ArrowLeft, ChevronRight, CloudDownload, CornerUpLeft, MapPin, ScanLine, Signpost, Wifi, WifiOff,
} from "lucide-react";
import { demoRoute } from "./demo-route.ts";
import { OfflineAISetup } from "./OfflineAISetup.tsx";
import { getSavedRoute, saveCheckpoint, saveRoute } from "./offline.ts";
import { findRecovery } from "./route.ts";
import { SignCheck } from "./SignCheck.tsx";
import { TrailMap } from "./TrailMap.tsx";
import { useOnline } from "./use-online.ts";

type Screen = "map" | "sign" | "checkpoints";

export function DemoLoop() {
  const [screen, setScreen] = useState<Screen>("map");
  const online = useOnline();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getSavedRoute(demoRoute).then((savedRoute) => {
      if (savedRoute) {
        setSaved(true);
        setConfirmedId(savedRoute.confirmedJunctionId);
      }
    }).catch(() => setNotice("Saved routes could not be opened in this browser."))
      .finally(() => setLoading(false));
  }, []);

  function show(next: Screen) {
    setScreen(next);
    window.scrollTo(0, 0);
  }

  async function download() {
    setDownloading(true);
    setNotice("");
    try {
      await saveRoute(demoRoute, confirmedId);
      setSaved(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The route could not be saved.");
    } finally {
      setDownloading(false);
    }
  }

  function confirm(id: string) {
    setConfirmedId(id);
    show("map");
    if (saved) {
      void saveCheckpoint(demoRoute, id)
        .catch(() => setNotice("This checkpoint is available until you close the app."));
    }
  }

  const current = demoRoute.junctions.find(({ id }) => id === confirmedId);
  const recovery = confirmedId ? findRecovery(demoRoute, confirmedId) : undefined;
  const segments = recovery?.status === "return" ? recovery.segments : [];
  const nextBranch = segments[0]?.branch;
  const loopIndex = confirmedId ? demoRoute.loop.indexOf(confirmedId) : -1;
  const plannedNextId = loopIndex >= 0 ? demoRoute.loop[(loopIndex + 1) % demoRoute.loop.length] : undefined;
  const plannedBranch = demoRoute.segments.find(({ from, to }) => from === confirmedId && to === plannedNextId)?.branch;
  const ConnectionIcon = online ? Wifi : WifiOff;
  const title = screen === "sign" ? "Check a trail sign" :
    screen === "checkpoints" ? "Choose a junction" : nextBranch ? "Rejoin the loop" : demoRoute.name;
  const intro = screen === "sign" ? "Match the visible words to a saved junction." :
    screen === "checkpoints" ? "Select the checkpoint you can confirm." :
    nextBranch ? `Follow the marked path to ${demoRoute.junctions.find(({ id }) => id === segments.at(-1)?.to)?.name}.` :
    `${demoRoute.junctions.length} checkpoints · Demo route`;

  return (
    <div className="app">
      <header className="app-bar">
        <div className="bar-inner">
          <a className="wordmark" href="/">
            <span className="brand-icon"><Signpost aria-hidden="true" /></span> Trail Junction
          </a>
          <span className="connection"><ConnectionIcon aria-hidden="true" /> {online ? "Online" : "Offline"}</span>
        </div>
      </header>
      <main className="workspace">
        <div className="intro">
          {screen === "map" && <a className="text-action back" href="/demo"><ArrowLeft aria-hidden="true" /> Sign demo</a>}
          {screen !== "map" && <button type="button" className="text-action back" onClick={() => show("map")}>
            <ArrowLeft aria-hidden="true" /> Trail map
          </button>}
          <p className={nextBranch && screen === "map" ? "eyebrow return-note" : "eyebrow"}>
            {screen === "map" && nextBranch ? `Confirmed at ${current?.name}` :
              screen === "map" ? saved ? "Saved for offline use" : "Trail guide" : demoRoute.name}
          </p>
          <h1>{title}</h1>
          <p className="muted">{intro}</p>
        </div>
        {notice && <p role="status" className="notice">{notice}</p>}
        {screen === "map" && (
          <div className="map-layout">
            <TrailMap pack={demoRoute} confirmedId={confirmedId} recovery={segments} />
            <div className="map-actions">
              <section className="trail-sheet">
                <div className="sheet-status">
                  <span className={nextBranch ? "status-icon return-icon" : "status-icon"}>
                    {nextBranch ? <CornerUpLeft aria-hidden="true" /> : <MapPin aria-hidden="true" />}
                  </span>
                  <div>
                    <p className="eyebrow">{nextBranch ? "Next marked branch" : current ? "Last confirmed" : "Current checkpoint"}</p>
                    <h2>{nextBranch ?? current?.name ?? "Choose a starting point"}</h2>
                  </div>
                </div>
                {plannedBranch && <p className="muted">Next on the loop: {plannedBranch}</p>}
                <button type="button" className="primary-action" onClick={() => show("sign")} disabled={loading || downloading}>
                  <ScanLine aria-hidden="true" /> {nextBranch ? "Check another sign" : "Check a trail sign"}
                </button>
                <button type="button" className="text-action" onClick={() => show("checkpoints")} disabled={loading || downloading}>Choose a junction</button>
              </section>
              {!saved && (
                <button type="button" className="secondary-action download" disabled={loading || downloading || !online} onClick={() => void download()}>
                  <CloudDownload aria-hidden="true" /> {downloading ? "Saving route…" : "Save for offline use"}
                </button>
              )}
              <OfflineAISetup online={online} />
            </div>
          </div>
        )}
        {screen === "sign" && <SignCheck pack={demoRoute} confirm={confirm} showMap={() => show("map")} showCheckpoints={() => show("checkpoints")} />}
        {screen === "checkpoints" && (
          <section className="trail-sheet checkpoint-list" aria-label="Known checkpoints">
            {demoRoute.junctions.map(({ id, name }) => (
              <button type="button" className="checkpoint" key={id} onClick={() => confirm(id)}>
                <MapPin aria-hidden="true" />
                <span>{name}<small>{demoRoute.loop.includes(id) ? "On the planned loop" : "Side trail"}</small></span>
                <ChevronRight aria-hidden="true" />
              </button>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
