import { useEffect, useState } from "react";
import { CloudDownload, Map, Search } from "lucide-react";
import { getSavedMaps, saveTrailMap } from "./offline.ts";
import { SavedTrail } from "./SavedTrail.tsx";
import {
  downloadTrailMap, normalizeTrailName, searchTrails, trails, type Trail, type TrailMapData, type UsgsTrail,
} from "./trail-catalog.ts";
import { downloadUsgsTrail, searchUsgsTrails, usgsSearchTerms } from "./usgs-trails.ts";

type LibraryView = "search" | "saved";
type NationalSearch = { query: string; trails: UsgsTrail[]; limited: boolean; failed: boolean };

const featuredStates: Record<(typeof trails)[number]["id"], string> = {
  "lower-yosemite-fall": "California",
  "cooks-meadow": "California",
  parus: "Utah",
};

function duplicatesFeatured(trail: UsgsTrail) {
  const name = (label: string) => normalizeTrailName(label).replace(/ trail$/, "");
  return trails.some((featured) =>
    name(featured.name) === name(trail.name) && trail.park === featuredStates[featured.id]);
}

export function TrailLibrary({ view, online, opened, setOpened, logTrail }: {
  view: LibraryView;
  online: boolean;
  opened: Trail | undefined;
  setOpened: (trail: Trail | undefined) => void;
  logTrail: (trail: Trail) => void;
}) {
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Record<string, TrailMapData>>({});
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [national, setNational] = useState<NationalSearch>();
  const [retry, setRetry] = useState(0);
  const searchQuery = query.trim();
  const canSearch = view === "search" && online && usgsSearchTerms(searchQuery).join("").length >= 3;

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

  useEffect(() => {
    if (!canSearch) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchUsgsTrails(searchQuery, controller.signal).then((result) => {
        if (!controller.signal.aborted) setNational({ query: searchQuery, ...result, failed: false });
      }).catch(() => {
        if (!controller.signal.aborted) setNational({ query: searchQuery, trails: [], limited: false, failed: true });
      });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [canSearch, searchQuery, retry]);

  async function download(trail: Trail) {
    setPending((ids) => new Set(ids).add(trail.id));
    setError("");
    try {
      const map = trail.format === "usgs-topo" ? await downloadUsgsTrail(trail) : await downloadTrailMap(trail);
      await saveTrailMap(map);
      setSaved((maps) => ({ ...maps, [trail.id]: map }));
      setAnnouncement(`${trail.name} is ready offline.`);
    } catch (reason) {
      const message = reason instanceof Error && !["TimeoutError", "AbortError", "TypeError"].includes(reason.name)
        ? reason.message : "Check your connection and try again.";
      setError(`Could not save ${trail.name}. ${message}`);
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
      <SavedTrail key={opened.id} trail={opened} map={saved[opened.id]} online={online}
        backLabel={view === "saved" ? "Saved trails" : "Search trails"} back={() => setOpened(undefined)}
        logHike={() => logTrail(opened)} />
    );
  }

  const localDownloads = Object.values(saved).flatMap((map) => map.format === "usgs-topo" ? [map.trail] : []);
  localDownloads.sort((a, b) => a.name.localeCompare(b.name) || a.park.localeCompare(b.park));
  const result = canSearch && national?.query === searchQuery ? national : undefined;
  const searching = canSearch && !result;
  const nationalMatches = result?.trails.filter((trail) => !duplicatesFeatured(trail)) ?? [];
  const localMatches = localDownloads.filter((trail) => normalizeTrailName(searchQuery).split(/\s+/).every((term) =>
    normalizeTrailName(`${trail.name} ${trail.park}`).includes(term)));
  const nationalIds = new Set(nationalMatches.map(({ id }) => id));
  const shownTrails = view === "saved"
    ? [...trails.filter((trail) => saved[trail.id]), ...localDownloads]
    : [...searchTrails(query), ...localMatches.filter((trail) => !nationalIds.has(trail.id)), ...nationalMatches];
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
            <input type="search" value={query} placeholder="e.g. Angels Landing" maxLength={80}
              onChange={(event) => {
                const value = event.target.value;
                if (value.trim() !== searchQuery) setNational(undefined);
                setQuery(value);
              }} />
          </span>
        </label>
      )}
      <p className="muted catalog-status" aria-live="polite">
        {loading ? "Loading trail maps…" : searching ? "Searching U.S. trails…" : shownTrails.length > 0
          ? `${shownTrails.length} ${shownTrails.length === 1 ? "trail" : "trails"}${view === "saved" ? " available offline" : ""}`
          : view === "saved" ? "Download a trail from search to find it here."
          : result?.failed ? "No local matches."
          : online && !canSearch ? "Enter at least three letters or numbers to search U.S. trails."
          : "No trails match. Try a different trail name."}
      </p>
      {!online && view === "search" && <p className="muted">Reconnect to search U.S. trails or download a new map.</p>}
      {result?.limited && <p className="muted">More trails match. Enter a more specific trail name.</p>}
      {result?.failed && (
        <div className="catalog-retry">
          <p className="muted" role="status">USGS search is temporarily unavailable.</p>
          <button type="button" className="text-action" onClick={() => {
            setNational(undefined);
            setRetry((attempt) => attempt + 1);
          }}>Retry search</button>
        </div>
      )}
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
