import { useState } from "react";
import { Signpost, Wifi, WifiOff } from "lucide-react";
import { TrailLibrary } from "./TrailLibrary.tsx";
import type { Trail } from "./trail-catalog.ts";
import { useOnline } from "./use-online.ts";

export function App() {
  const [view, setView] = useState<"search" | "saved">("search");
  const [opened, setOpened] = useState<Trail>();
  const online = useOnline();
  const ConnectionIcon = online ? Wifi : WifiOff;

  function show(next: typeof view) {
    setOpened(undefined);
    setView(next);
    window.scrollTo(0, 0);
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
      <nav className="section-nav" aria-label="Trail library">
        <div>
          <button type="button" aria-current={view === "search" ? "page" : undefined} onClick={() => show("search")}>Search trails</button>
          <button type="button" aria-current={view === "saved" ? "page" : undefined} onClick={() => show("saved")}>Saved</button>
        </div>
      </nav>
      <main className="workspace">
        <TrailLibrary view={view} online={online} opened={opened} setOpened={setOpened} />
      </main>
    </div>
  );
}
