import { useState } from "react";
import { BookOpen, Compass, Download, Play, Signpost, Wifi, WifiOff } from "lucide-react";
import { AccountJournalView } from "./AccountJournalView.tsx";
import { journalAccountsEnabled } from "./firebase-app.ts";
import { TrailJournal, type JournalTrail } from "./TrailJournal.tsx";
import { TrailLibrary } from "./TrailLibrary.tsx";
import type { Trail } from "./trail-catalog.ts";
import { useOnline } from "./use-online.ts";

export function App() {
  const [view, setView] = useState<"search" | "saved" | "journal">(() =>
    new URLSearchParams(window.location.search).get("view") === "journal" ? "journal" : "search",
  );
  const [libraryView, setLibraryView] = useState<"search" | "saved">("search");
  const [opened, setOpened] = useState<Trail>();
  const [detail, setDetail] = useState<Trail>();
  const [journalTrail, setJournalTrail] = useState<JournalTrail>();
  const online = useOnline();
  const ConnectionIcon = online ? Wifi : WifiOff;

  function show(next: typeof view) {
    if (next === "journal" && view === "journal") return;
    setOpened(undefined);
    setDetail(undefined);
    setJournalTrail(undefined);
    if (next !== "journal") setLibraryView(next);
    setView(next);
    const url = new URL(window.location.href);
    if (next === "journal") url.searchParams.set("view", "journal");
    else url.searchParams.delete("view");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
    window.scrollTo(0, 0);
  }

  function logTrail(trail: Trail) {
    show("journal");
    setJournalTrail({ trail: trail.name, location: trail.park });
  }

  return (
    <div className="app">
      <header className="app-bar">
        <div className="bar-inner">
          <a className="wordmark" href="/">
            <span className="brand-icon"><Signpost aria-hidden="true" /></span> Trail Junction
          </a>
          <nav className="section-nav" aria-label="Trail app">
            <button type="button" aria-current={view === "search" ? "page" : undefined} onClick={() => show("search")}>
              <Compass aria-hidden="true" /> Explore
            </button>
            <button type="button" aria-current={view === "saved" ? "page" : undefined} onClick={() => show("saved")}>
              <Download aria-hidden="true" /> Saved
            </button>
            <button type="button" aria-current={view === "journal" ? "page" : undefined} onClick={() => show("journal")}>
              <BookOpen aria-hidden="true" /> Journal
            </button>
          </nav>
          <div className="bar-tools">
            <span className="connection"><ConnectionIcon aria-hidden="true" /> {online ? "Online" : "Offline"}</span>
            <a className="bar-demo" href="/demo"><Play aria-hidden="true" /> <span>Sign demo</span></a>
          </div>
        </div>
      </header>
      <main className="workspace">
        <div hidden={view === "journal"}>
          <TrailLibrary view={libraryView} online={online} opened={opened} setOpened={setOpened}
            detail={detail} setDetail={setDetail} logTrail={logTrail} />
        </div>
        {view === "journal" && (journalAccountsEnabled
          ? <AccountJournalView online={online} trail={journalTrail} />
          : <TrailJournal online={online} trail={journalTrail} />)}
      </main>
    </div>
  );
}
