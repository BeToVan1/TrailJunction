import { useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, CircleCheck, Map, MapPin, Signpost } from "lucide-react";
import { MobileSignReadingNotice } from "./MobileSignReadingNotice.tsx";
import { OfflineAISetup } from "./OfflineAISetup.tsx";
import { OfflineTrailMap } from "./OfflineTrailMap.tsx";
import { PhotoPicker } from "./PhotoPicker.tsx";
import { matchSavedSignToMap, type SavedSignMapMatch } from "./saved-sign-map.ts";
import { TrailSignReader } from "./TrailSignReader.tsx";
import type { Trail, TrailMapData } from "./trail-catalog.ts";

const milesFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function SavedTrail({ trail, map, online, backLabel, back, logHike }: {
  trail: Trail;
  map: TrailMapData;
  online: boolean;
  backLabel: string;
  back: () => void;
  logHike: () => void;
}) {
  const [capture, setCapture] = useState<{ file: File; revision: number }>();
  const [mapMatch, setMapMatch] = useState<SavedSignMapMatch>();
  const [branchChoices, setBranchChoices] = useState<SavedSignMapMatch[]>([]);

  function usePhoto(file: File) {
    setMapMatch(undefined);
    setBranchChoices([]);
    setCapture((previous) => ({ file, revision: (previous?.revision ?? 0) + 1 }));
    window.scrollTo(0, 0);
  }

  function showMap(match?: SavedSignMapMatch) {
    setMapMatch(match);
    setCapture(undefined);
    window.scrollTo(0, 0);
  }

  if (capture) {
    return (
      <TrailSignReader key={capture.revision} photo={capture.file} trailName={trail.name}
        onPhoto={usePhoto} back={() => showMap()} mapReview={(entries) => {
          const matches = matchSavedSignToMap(entries, trail);
          return (
            <section className="saved-sign-matches" aria-label="Saved map matches">
              {matches.length > 0 ? <>
                <h3>On your saved map</h3>
                <p className="muted">{trail.id === "scout-junction"
                  ? "Check the arrows and choose a branch to highlight from Scout Lookout."
                  : "Check the sign, then choose what to show. The sign alone can’t confirm where you’re standing."}</p>
                {matches.map((match) => <button key={match.name} type="button" className="primary-action" onClick={() => {
                  if (match.kind === "branch") setBranchChoices(matches);
                  showMap(match);
                }}>
                  <MapPin aria-hidden="true" /> Show {match.name} on map
                </button>)}
              </> : <>
                <h3>No match on this map</h3>
                <p className="muted">{trail.id === "scout-junction"
                  ? "Include the Scout Lookout heading and the destination arrows. You can correct the reading to match the photo."
                  : `The reading doesn’t match ${trail.name} or a known place on its saved map. Check that you opened the right trail.`}</p>
                <button type="button" className="secondary-action" onClick={() => showMap()}>View saved map</button>
              </>}
            </section>
          );
        }} />
    );
  }

  const featured = trail.format !== "usgs-topo" ? trail : undefined;
  const facts = trail.format === "usgs-topo" ? trail.facts : undefined;
  // Older offline maps keep their mileage in the trail summary.
  const legacyDistance = trail.details.split(" · ")[0];
  const mappedMiles = facts?.distanceMiles;
  const mappedDistance = mappedMiles && Number.isFinite(mappedMiles) && mappedMiles > 0
    ? (mappedMiles < .01 ? "<0.01 mi" : `${milesFormat.format(mappedMiles)} mi`)
    : legacyDistance.endsWith(" mapped") ? legacyDistance.replace(/ mapped$/, "") : undefined;
  const mapGuide = trail.id === "scout-junction"
    ? "The pin marks the sign at Scout Lookout. Read it to highlight either branch."
    : map.format === "image"
    ? "Follow the yellow route on the park map."
    : `The ${mapMatch?.kind === "trail" ? "green" : "blue"} line shows the trail segments included in this download.`;
  const stats = [
    { label: featured ? "Distance" : "Mapped distance", value: featured?.distance ?? mappedDistance },
    { label: "Elevation gain", value: featured?.elevationGain },
    { label: "Route type", value: featured?.routeType },
    { label: "Difficulty", value: featured?.difficulty },
    { label: "Reported surface", value: facts?.surfaces?.join(", ") },
  ].filter(({ value }) => value);

  return (
    <div className="trail-library saved-trail">
      <div className="intro">
        <button type="button" className="text-action back" onClick={back}>
          <ArrowLeft aria-hidden="true" /> {backLabel}
        </button>
        <div className="saved-trail-meta">
          <p className="eyebrow">{trail.park}</p>
          <span className="catalog-ready"><CircleCheck aria-hidden="true" /> Saved offline</span>
        </div>
        <h1>{trail.name}</h1>
      </div>
      <div className="saved-trail-layout" data-match={mapMatch ? "" : undefined}>
        {mapMatch && <section className="trail-sheet saved-map-guide map-match" aria-label="Sign match">
          <div className="saved-tool-heading">
            <span className="saved-tool-icon"><MapPin aria-hidden="true" /></span>
            <div role="status">
              <h2>{mapMatch.name}</h2>
              <p className="muted">Matched “{mapMatch.label}” on the sign.</p>
            </div>
          </div>
          {branchChoices.filter((branch) => branch.name !== mapMatch.name).map((branch) => (
            <button key={branch.name} type="button" className="secondary-action saved-map-source" onClick={() => {
              setMapMatch(branch);
              window.scrollTo(0, 0);
            }}>Show {branch.name} branch</button>
          ))}
          <button type="button" className="text-action saved-map-source" onClick={() => {
            setMapMatch(undefined);
            setBranchChoices([]);
          }}>Clear sign highlight</button>
        </section>}
        <OfflineTrailMap trail={trail} map={map} match={mapMatch} />
        <div className="saved-trail-tools">
          <section className="trail-sheet saved-map-guide" aria-labelledby="saved-map-guide-title">
            <div className="saved-tool-heading">
              <span className="saved-tool-icon"><Map aria-hidden="true" /></span>
              <div>
                <h2 id="saved-map-guide-title">About this map</h2>
                <p className="muted">{mapGuide}</p>
              </div>
            </div>
            {stats.length > 0 && (
              <dl className="saved-map-stats">
                {stats.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
            )}
            {featured && <p className="muted saved-map-access">{featured.access}</p>}
            <a className="text-action saved-map-source" href={trail.info} target="_blank" rel="noreferrer">
              {featured ? "Official trail details" : "USGS Trails Explorer"} <ArrowUpRight aria-hidden="true" />
            </a>
          </section>
          <div className="trail-sheet saved-field-tools">
            <section aria-labelledby="read-trail-sign-heading">
              <div className="saved-tool-heading">
                <span className="saved-tool-icon"><Signpost aria-hidden="true" /></span>
                <div>
                  <h2 id="read-trail-sign-heading">Read a trail sign</h2>
                  <p className="muted">Include every destination and its arrow in the photo.</p>
                </div>
              </div>
              <MobileSignReadingNotice />
              <div className="saved-sign-actions">
                <PhotoPicker onPhoto={usePhoto} cameraLabel="Take sign photo" />
                <OfflineAISetup online={online} />
              </div>
            </section>
            <section aria-labelledby="saved-journal-title">
              <div className="saved-tool-heading">
                <span className="saved-tool-icon"><BookOpen aria-hidden="true" /></span>
                <div>
                  <h2 id="saved-journal-title">Trail journal</h2>
                  <p className="muted">Save the date, notes, and photos from this hike.</p>
                </div>
              </div>
              <button type="button" className="secondary-action" onClick={logHike}>
                Log this hike <ArrowUpRight aria-hidden="true" />
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
