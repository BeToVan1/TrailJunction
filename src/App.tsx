import { useEffect, useMemo, useState } from "react";
import { BookOpen, Compass, Download, Play, Signpost, Wifi, WifiOff } from "lucide-react";
import { AccountJournalView } from "./AccountJournalView.tsx";
import { getTrailFirebaseApp, journalAccountsEnabled } from "./firebase-app.ts";
import { createAccountJournal, deviceJournal } from "./journal.ts";
import { useJournalAccount } from "./JournalAccount.tsx";
import { rampartUrl } from "./rampart-junction.ts";
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
  const [hikeHistory, setHikeHistory] = useState<{ accountId?: string; hikes: JournalTrail[] }>();
  const account = useJournalAccount(journalAccountsEnabled);
  const accountId = account.verified ? account.user?.uid : undefined;
  const journal = useMemo(() =>
    accountId ? createAccountJournal(getTrailFirebaseApp().options.projectId!, accountId) : undefined, [accountId]);
  const recentHikes = hikeHistory && hikeHistory.accountId === accountId ? hikeHistory.hikes : undefined;
  const online = useOnline();
  const ConnectionIcon = online ? Wifi : WifiOff;

  useEffect(() => {
    if (view !== "search") return;
    let active = true;
    async function loadHistory() {
      const sources = journal ? [deviceJournal, journal] : [deviceJournal];
      const results = await Promise.allSettled(sources.map((store) => store.getHikes()));
      const hikes = results.flatMap((result) => result.status === "fulfilled" ? result.value : [])
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(({ trail, location }) => ({ trail, location }));
      if (active) setHikeHistory({ accountId, hikes });
    }
    void loadHistory();
    return () => { active = false; };
  }, [view, accountId, journal]);

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
            <a className="bar-demo" href={rampartUrl}><Play aria-hidden="true" /> <span>Sign demo</span></a>
          </div>
        </div>
      </header>
      <main className="workspace">
        <div hidden={view === "journal"}>
          <TrailLibrary view={libraryView} online={online} opened={opened} setOpened={setOpened}
            detail={detail} setDetail={setDetail} logTrail={logTrail} exploring={view === "search"} hikes={recentHikes} />
        </div>
        {view === "journal" && (journalAccountsEnabled
          ? <AccountJournalView online={online} trail={journalTrail} account={account} journal={journal} />
          : <TrailJournal online={online} trail={journalTrail} />)}
      </main>
    </div>
  );
}
