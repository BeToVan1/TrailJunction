import { useEffect, useState } from "react";
import { ArrowLeft, CloudDownload, Map, Search } from "lucide-react";
import { getSavedMaps, saveTrailMap } from "./offline.ts";
import { OfflineTrailMap } from "./OfflineTrailMap.tsx";
import { downloadTrailMap, searchTrails, trails, type Trail, type TrailMapData } from "./trail-catalog.ts";

type LibraryView = "search" | "saved";

export function TrailLibrary({ view, online, opened, setOpened }: {
  view: LibraryView;
  online: boolean;
  opened: Trail | undefined;
  setOpened: (trail: Trail | undefined) => void;
}) {
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Record<string, TrailMapData>>({});
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    let active = true;
    getSavedMaps().then((maps) => {
      if (active) setSaved(maps);
    }).catch(() => {
      if (active) setError("Saved maps could not be opened in this browser.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function download(trail: Trail) {
    setPending((ids) => new Set(ids).add(trail.id));
    setError("");
    try {
      const map = await downloadTrailMap(trail);
      await saveTrailMap(map);
      setSaved((maps) => ({ ...maps, [trail.id]: map }));
      setAnnouncement(`${trail.name} is ready offline.`);
    } catch {
      setError(`Could not save ${trail.name}. Check your connection and try again.`);
    } finally {
      setPending((ids) => {
        const next = new Set(ids);
        next.delete(trail.id);
        return next;
      });
    }
  }

  function open(trail: Trail) {
    setOpened(trail);
    window.scrollTo(0, 0);
  }

  if (opened && saved[opened.id]) {
    return (
      <div className="trail-library">
        <div className="intro">
          <button type="button" className="text-action back" onClick={() => setOpened(undefined)}>
            <ArrowLeft aria-hidden="true" /> {view === "saved" ? "Saved trails" : "Search trails"}
          </button>
          <p className="eyebrow">{opened.park} · Saved offline</p>
          <h1>{opened.name}</h1>
          <p className="muted">{opened.details}</p>
        </div>
        <OfflineTrailMap trail={opened} map={saved[opened.id]} />
        <a className="park-details" href={opened.info} target="_blank" rel="noreferrer">Official trail details</a>
      </div>
    );
  }

  const shownTrails = view === "saved" ? trails.filter((trail) => saved[trail.id]) : searchTrails(query);
  return (
    <div className="trail-library">
      <div className="intro">
        <h1>{view === "search" ? "Find a trail" : "Saved trails"}</h1>
      </div>
      {view === "search" && (
        <label className="catalog-search">
          <span>Trail or park name</span>
          <span className="catalog-field">
            <Search aria-hidden="true" />
            <input type="search" value={query} placeholder="e.g. Yosemite" onChange={(event) => setQuery(event.target.value)} />
          </span>
        </label>
      )}
      <p className="muted catalog-status" aria-live="polite">
        {loading ? "Loading trail maps…" : shownTrails.length > 0
          ? `${shownTrails.length} ${shownTrails.length === 1 ? "trail" : "trails"}${view === "saved" ? " available offline" : ""}`
          : view === "saved" ? "Download a trail from search to find it here." : "No trails match. Try a different trail or park name."}
      </p>
      {!online && view === "search" && <p className="muted">Reconnect to download a new map.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <p className="screen-reader-only" role="status">{announcement}</p>
      <ul className="catalog-results">
        {shownTrails.map((trail) => (
          <li key={trail.id} className="catalog-trail">
            <div>
              <h2>{trail.name}</h2>
              <p className="muted">{trail.park}</p>
              <p className="muted catalog-detail">{trail.details}</p>
              {saved[trail.id] && <p className="catalog-ready">Saved offline</p>}
            </div>
            {saved[trail.id] ? (
              <button type="button" className="secondary-action" aria-label={`Open map for ${trail.name}`} onClick={() => open(trail)}>
                <Map aria-hidden="true" /> Open map
              </button>
            ) : (
              <button
                type="button" className="primary-action" aria-label={`Download ${trail.name}`}
                disabled={loading || !online || pending.has(trail.id)}
                onClick={() => void download(trail)}
              >
                <CloudDownload aria-hidden="true" /> {pending.has(trail.id) ? "Saving…" : "Download"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
