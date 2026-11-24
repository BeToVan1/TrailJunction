import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, CloudDownload, MapPin } from "lucide-react";
import { PublicHeader } from "./Landing.tsx";
import { MobileSignReadingNotice } from "./MobileSignReadingNotice.tsx";
import { OfflineAISetup } from "./OfflineAISetup.tsx";
import { DestinationRing, JunctionRoute, TopoOverlay } from "./OfflineTrailMap.tsx";
import { isRampartSaved, saveRampart } from "./offline.ts";
import { mapPoint } from "./map-projection.ts";
import {
  matchRampartSign, rampartConditions, rampartGuide, rampartMap, rampartName, rampartPhoto, rampartPhotoSource, rampartSignLabelKey,
  rampartTrips, verifyRampartSampleArrows, type RampartTrip,
} from "./rampart-junction.ts";
import { SampleSignFrame } from "./SampleSignFrame.tsx";
import type { SignEntry } from "./sign-reading.ts";
import type { Coordinate } from "./trail-catalog.ts";
import { TrailSignReader } from "./TrailSignReader.tsx";
import { useOnline } from "./use-online.ts";
import { nationalMap, usgsTrailsLayer } from "./usgs-trails.ts";

const sampleAlt = "National Park Service photo of both sign panels at Rampart Ridge Junction.";

function JunctionMap({ trip }: { trip?: RampartTrip }) {
  const { extent, size, lines, url, junction, pyramid } = rampartMap;
  const [junctionX, junctionY] = mapPoint(junction, extent, size, size);
  const marks: { location: Coordinate; label: string; dx: number; dy: number }[] = [
    { location: pyramid, label: "Pyramid Creek", dx: 20, dy: -22 },
    { location: rampartTrips[0].lines[0].at(-1)!, label: "Devil’s Dream Camp", dx: 19, dy: -24 },
    { location: (trip?.name === "Longmire" ? trip : rampartTrips[1]).lines[0].at(-1)!, label: "Longmire", dx: 20, dy: -19 },
  ];
  const mapLabel = `You are at ${rampartName} in this demo. ${trip
    ? `The highlighted trail leads from the junction to ${trip.name}.`
    : "The map shows the Wonderland Trail and Rampart Ridge Trail."}`;

  return (
    <figure className="map-frame park-map rampart-map">
      <TopoOverlay extent={extent} width={size} height={size} url={url} lines={lines} label={mapLabel}>
        {trip?.lines.map((line, index) => {
          const points = line.map((point) => mapPoint(point, extent, size, size).join(",")).join(" ");
          return <JunctionRoute key={`${trip.id}-${index}`} points={points} />;
        })}
        {marks.map(({ location, label, dx, dy }) => {
          const [x, y] = mapPoint(location, extent, size, size);
          const selected = trip?.name === label;
          return <g key={label}>
            <circle className={selected ? "park-route-end park-destination" : "park-route-end"} cx={x} cy={y} r={selected ? 14 : 10} />
            {selected && <DestinationRing x={x} y={y} radius={18} />}
            <text x={x + dx} y={y + dy}>{label}</text>
          </g>;
        })}
        <text x="945" y="66" textAnchor="middle">N</text>
        <path d="M945 124V83m-13 15 13-15 13 15" className="park-north-arrow" />
        <g className="rampart-location" transform={`translate(${junctionX} ${junctionY})`}>
          <path className="rampart-location-leader" d="M-55 -32H-22" />
          <path className="rampart-location-pin" d="M0 0C-5-8-24-24-24-38a24 24 0 1 1 48 0C24-24 5-8 0 0Z" />
          <circle cy="-38" r="8" fill="#fff" />
          <rect className="rampart-location-label" x="-418" y="-103" width="366" height="98" rx="17" />
          <text x="-392" y="-61">You are here</text>
          <text className="rampart-location-name" x="-392" y="-29">{rampartName}</text>
        </g>
      </TopoOverlay>
      <figcaption className="map-key">
        {trip && <span><i /> {trip.name} via {trip.via}</span>}
        <a href={usgsTrailsLayer} target="_blank" rel="noreferrer">USGS trail data</a>
        <a href={nationalMap} target="_blank" rel="noreferrer">USGS topographic map</a>
      </figcaption>
    </figure>
  );
}

export function RampartJunction() {
  const online = useOnline();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [camera, setCamera] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [destination, setDestination] = useState<RampartTrip["name"]>("Devil’s Dream Camp");
  const [photo, setPhoto] = useState<File>();
  const [highlight, setHighlight] = useState<{ trip: RampartTrip; evidence: string; manual: boolean }>();
  const [manual, setManual] = useState(false);
  const [error, setError] = useState("");
  const cameraHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    void isRampartSaved().then(setSaved).catch(() => setError("Couldn’t check the saved map in this browser."));
  }, []);

  useEffect(() => {
    if (camera) cameraHeading.current?.focus({ preventScroll: true });
  }, [camera]);

  function toTop() { window.scrollTo(0, 0); }

  function openCamera() {
    setPhoto(undefined);
    setCamera(true);
    setError("");
    toTop();
  }

  async function download() {
    setSaving(true);
    setError("");
    try {
      await saveRampart();
      setSaved(true);
    } catch {
      setError("The map and sample photo couldn’t be saved. Try again while online.");
    } finally {
      setSaving(false);
    }
  }

  async function useSample() {
    setSampleLoading(true);
    setError("");
    try {
      const response = await fetch(rampartPhoto);
      if (!response.ok) throw new Error();
      setPhoto(new File([await response.blob()], "Rampart Ridge Junction.jpg", { type: "image/jpeg" }));
      setCamera(false);
      setHighlight(undefined);
      toTop();
    } catch {
      setError("The sample photo couldn’t load. Open this junction online to download it.");
    } finally {
      setSampleLoading(false);
    }
  }

  function confirm(entries: readonly SignEntry[], trip: RampartTrip = rampartTrips[0]) {
    const evidence = matchRampartSign(entries, trip);
    if (evidence) {
      setHighlight({ trip, evidence: evidence.label, manual: false });
    } else {
      return "To confirm Devil’s Dream Camp, look for “DEVIL’S DREAM CMP. 3.9” with a left arrow on the Wonderland Trail panel. Edit the reading to match the photo or choose a marked branch.";
    }
    setPhoto(undefined);
    toTop();
  }

  function chooseManual(trip: RampartTrip) {
    setHighlight({ trip, evidence: "", manual: true });
    setManual(false);
    setPhoto(undefined);
  }

  function longmireChoices(entries?: readonly SignEntry[]) {
    return <div className="journal-form" role="group" aria-label="Which route to Longmire?">
      <h3>Which route to Longmire?</h3>
      {[rampartTrips[2], rampartTrips[1]].map(route => (
        <button key={route.id} type="button" className="secondary-action"
          disabled={entries && !matchRampartSign(entries, route)}
          onClick={() => entries ? confirm(entries, route) : chooseManual(route)}>
          {route.direction === "left" ? "←" : "→"} {route.via}
        </button>
      ))}
      {entries && [rampartTrips[1], rampartTrips[2]].some(route => !matchRampartSign(entries, route)) &&
        <p className="muted">A route needs its distance and arrow in the reading. Edit the labels or choose a marked branch manually.</p>}
    </div>;
  }

  return (
    <div className="app">
      <PublicHeader label="Junction guide" />
      <main className="workspace">
        {camera ? <div className="map-layout junction-viewfinder">
          <SampleSignFrame src={rampartPhoto} alt={sampleAlt} framing />
          <section className="junction-camera-panel" aria-labelledby="rampart-capture">
            <p className="public-kicker">{rampartName} · Camera</p>
            <h1 id="rampart-capture" ref={cameraHeading} tabIndex={-1}>Frame the whole sign.</h1>
            <p className="junction-camera-copy">Fit both sign panels in the frame so the app can read each destination, distance, and arrow.</p>
            <div className="junction-camera-actions">
              <button type="button" className="public-button" disabled={sampleLoading} onClick={() => void useSample()}>
                {sampleLoading ? "Capturing photo…" : "Take photo"} <Camera aria-hidden="true" />
              </button>
              <button type="button" className="public-button public-secondary" disabled={sampleLoading} onClick={() => {
                setCamera(false);
                setError("");
                toTop();
              }}>Back</button>
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <p className="junction-camera-copy">This viewfinder uses an NPS sample photo to simulate taking a picture at the junction.</p>
          </section>
        </div> : photo && !manual ? <TrailSignReader photo={photo} trailName={rampartName}
          sample={{
            src: rampartPhoto,
            alt: sampleAlt,
            credit: rampartPhotoSource,
            retake: openCamera,
            destination,
            labelKey: rampartSignLabelKey,
            verifyArrows: verifyRampartSampleArrows,
            onConfirm: confirm,
            routeChoices: destination === "Longmire" ? longmireChoices : undefined,
            chooseBranch: () => { setManual(true); toTop(); },
          }}
          back={() => { setPhoto(undefined); toTop(); }} /> : <>
          <div className="intro">
            <a className="text-action back" href="/app"><ArrowLeft aria-hidden="true" /> Trail app</a>
            <h1>{rampartName}</h1>
            <p className="muted">Mount Rainier National Park · Wonderland Trail</p>
          </div>
          <div className="map-layout junction-map-layout" data-match={highlight ? "" : undefined}>
            {highlight && <div className="junction-result map-match" role="status">
              <strong>{highlight.trip.name} · {highlight.trip.via}</strong>
              <p>{highlight.manual ? "Branch selected on the map." : `Matched “${highlight.evidence}” on the sign.`}</p>
            </div>}
            <JunctionMap trip={highlight?.trip ?? (manual && destination !== "Longmire" ? rampartTrips[0] : undefined)} />
            <div className="map-actions">
              <section className="trail-sheet trail-sign-tools" aria-labelledby="rampart-destination">
                <h2 id="rampart-destination"><MapPin aria-hidden="true" /> Choose a destination</h2>
                <label className="junction-destination">
                  <span className="screen-reader-only">Destination</span>
                  <select value={destination} onChange={(event) => {
                    setDestination(event.target.value === "Longmire" ? "Longmire" : "Devil’s Dream Camp");
                    setHighlight(undefined);
                  }}>
                    <option>Devil’s Dream Camp</option><option>Longmire</option>
                  </select>
                </label>
                {manual ? <>
                  {destination === "Longmire" ? longmireChoices() : <>
                    <p className="muted">The map highlights {rampartTrips[0].via}. Check it against the sign before confirming.</p>
                    <button type="button" className="secondary-action" onClick={() => chooseManual(rampartTrips[0])}>
                      Confirm branch to {destination}</button>
                  </>}
                  <button type="button" className="text-action" onClick={() => setManual(false)}>{photo ? "Back to photo" : "Cancel"}</button>
                </> : <>
                  <p className="muted">You’re at the signpost marked on the map. Use the sample camera to read both panels.</p>
                  <MobileSignReadingNotice />
                  <button type="button" className="primary-action" onClick={openCamera}>
                    <Camera aria-hidden="true" /> Open sample camera
                  </button>
                  <button type="button" className="text-action" onClick={() => { setHighlight(undefined); setManual(true); }}>Choose a marked branch</button>
                </>}
              </section>
              {saved ? <p className="muted" role="status">Map and sample photo saved offline</p> :
                <button type="button" className="secondary-action" disabled={!online || saving} onClick={() => void download()}>
                  <CloudDownload aria-hidden="true" /> {saving ? "Downloading…" : "Download junction for offline use"}
                </button>}
              {error && <p className="error" role="alert">{error}</p>}
              <OfflineAISetup online={online} />
              <div className="sheet-links">
                <a className="text-action" href={rampartGuide} target="_blank" rel="noreferrer">NPS trail guide</a>
                <a className="text-action" href={rampartConditions} target="_blank" rel="noreferrer">Current trail conditions</a>
              </div>
            </div>
          </div>
        </>}
      </main>
    </div>
  );
}
