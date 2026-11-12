import { useState } from "react";
import { Signpost, Wifi, WifiOff } from "lucide-react";
import { TrailJournal, type JournalTrail } from "./TrailJournal.tsx";
import { TrailLibrary } from "./TrailLibrary.tsx";
import type { Trail } from "./trail-catalog.ts";
import { useOnline } from "./use-online.ts";

export function App() {
  const [view, setView] = useState<"search" | "saved" | "journal">("search");
  const [libraryView, setLibraryView] = useState<"search" | "saved">("search");
  const [opened, setOpened] = useState<Trail>();
  const [journalTrail, setJournalTrail] = useState<JournalTrail>();
  const online = useOnline();
  const ConnectionIcon = online ? Wifi : WifiOff;

  function show(next: typeof view) {
    if (next === "journal" && view === "journal") return;
    setOpened(undefined);
    setJournalTrail(undefined);
    if (next !== "journal") setLibraryView(next);
    setView(next);
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
          <span className="connection"><ConnectionIcon aria-hidden="true" /> {online ? "Online" : "Offline"}</span>
        </div>
      </header>
      <nav className="section-nav" aria-label="Trail app">
        <div>
          <button type="button" aria-current={view === "search" ? "page" : undefined} onClick={() => show("search")}>Search trails</button>
          <button type="button" aria-current={view === "saved" ? "page" : undefined} onClick={() => show("saved")}>Saved</button>
          <button type="button" aria-current={view === "journal" ? "page" : undefined} onClick={() => show("journal")}>Journal</button>
        </div>
      </nav>
      <main className="workspace">
        <div hidden={view === "journal"}>
          <TrailLibrary view={libraryView} online={online} opened={opened} setOpened={setOpened} logTrail={logTrail} />
        </div>
        {view === "journal" && <TrailJournal online={online} trail={journalTrail} />}
      </main>
    </div>
  );
}
