import { useEffect, useState } from "react";
import { ArrowLeft, CloudDownload, MapPin, ScanLine } from "lucide-react";
import { PublicHeader } from "./Landing.tsx";
import { MobileSignReadingNotice } from "./MobileSignReadingNotice.tsx";
import { OfflineAISetup } from "./OfflineAISetup.tsx";
import { TopoOverlay } from "./OfflineTrailMap.tsx";
import { isRampartSaved, saveRampart } from "./offline.ts";
import { mapPoint } from "./map-projection.ts";
import { PhotoPicker } from "./PhotoPicker.tsx";
import {
  matchRampartSign, rampartConditions, rampartGuide, rampartMap, rampartName, rampartPhoto, rampartPhotoSource,
  rampartTrips, type RampartTrip,
} from "./rampart-junction.ts";
import type { SignEntry } from "./sign-reading.ts";
import type { Coordinate } from "./trail-catalog.ts";
import { TrailSignReader } from "./TrailSignReader.tsx";
import { useOnline } from "./use-online.ts";
import { nationalMap, usgsTrailsLayer } from "./usgs-trails.ts";

function JunctionMap({ trip }: { trip?: RampartTrip }) {
  const { extent, size, lines, url, junction, pyramid } = rampartMap;
  const marks: { location: Coordinate; label: string; dx: number; dy: number; anchor?: "end" }[] = [
    { location: junction, label: "Rampart Ridge Junction", dx: -23, dy: -20, anchor: "end" },
    { location: pyramid, label: "Pyramid Creek", dx: 20, dy: -22 },
    { location: rampartTrips[0].lines[0].at(-1)!, label: "Devil’s Dream Camp", dx: 19, dy: -24 },
    { location: rampartTrips[1].lines[0].at(-1)!, label: "Longmire", dx: 20, dy: -19 },
  ];

  return (
    <figure className="map-frame park-map rampart-map">
      <TopoOverlay extent={extent} width={size} height={size} url={url} lines={lines}
        label={trip ? `USGS map highlighting the trail from Rampart Ridge Junction to ${trip.name}.` : "USGS map of the Wonderland Trail and Rampart Ridge junction."}>
        {trip?.lines.map((line) => {
          const points = line.map((point) => mapPoint(point, extent, size, size).join(",")).join(" ");
          return <g key={trip.id}><polyline className="park-route-halo" points={points} />
            <polyline className="rampart-highlight" points={points} /></g>;
        })}
        {marks.map(({ location, label, dx, dy, anchor }) => {
          const [x, y] = mapPoint(location, extent, size, size);
          return <g key={label}>
            <circle className="park-route-end" cx={x} cy={y} r="10" />
            <text x={x + dx} y={y + dy} textAnchor={anchor}>{label}</text>
          </g>;
        })}
        <text x="945" y="66" textAnchor="middle">N</text>
        <path d="M945 124V83m-13 15 13-15 13 15" className="park-north-arrow" />
      </TopoOverlay>
      <figcaption className="map-key">
        {trip && <span><i /> Route to {trip.name}</span>}
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
  const [sampleLoading, setSampleLoading] = useState(false);
  const [trip, setTrip] = useState<RampartTrip>(rampartTrips[0]);
  const [photo, setPhoto] = useState<{ file: File; sample: boolean; revision: number }>();
  const [highlight, setHighlight] = useState<{ evidence: string; manual: boolean }>();
  const [manual, setManual] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void isRampartSaved().then(setSaved).catch(() => setError("Couldn’t check the saved map in this browser."));
  }, []);

  function toTop() { window.scrollTo(0, 0); }

  function openPhoto(file: File, sample = false) {
    setPhoto((previous) => ({ file, sample, revision: (previous?.revision ?? 0) + 1 }));
    setHighlight(undefined);
    setManual(false);
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
      openPhoto(new File([await response.blob()], "Rampart Ridge Junction.jpg", { type: "image/jpeg" }), true);
    } catch {
      setError("The sample photo couldn’t load. Open this junction online to download it.");
    } finally {
      setSampleLoading(false);
    }
  }

  function confirm(entries: readonly SignEntry[]) {
    const evidence = matchRampartSign(entries, trip);
    if (evidence) {
      setHighlight({ evidence: evidence.label, manual: false });
    } else {
      return `The reading didn’t confirm the branch for ${trip.name}. Check the labels and arrows or choose a marked branch.`;
    }
    setPhoto(undefined);
    toTop();
  }

  return (
    <div className="app">
      <PublicHeader label="Junction guide" />
      <main className="workspace">
        {photo && !manual ? <TrailSignReader key={photo.revision} photo={photo.file} trailName={rampartName}
          onPhoto={(file) => openPhoto(file)} onConfirm={confirm}
          photoCredit={photo.sample ? { label: "Sample photo by the National Park Service", href: rampartPhotoSource } : undefined}
          back={() => { setPhoto(undefined); toTop(); }}
          chooseBranch={() => { setManual(true); toTop(); }} /> : <>
          <div className="intro">
            <a className="text-action back" href="/app"><ArrowLeft aria-hidden="true" /> Trail app</a>
            <h1>{rampartName}</h1>
            <p className="muted">Mount Rainier National Park · Wonderland Trail</p>
          </div>
          <div className="map-layout">
            <JunctionMap trip={highlight || manual ? trip : undefined} />
            <div className="map-actions">
              <section className="trail-sheet trail-sign-tools" aria-labelledby="rampart-destination">
                <h2 id="rampart-destination"><MapPin aria-hidden="true" /> Choose a destination</h2>
                <label className="junction-destination">
                  <span className="screen-reader-only">Destination</span>
                  <select value={trip.id} onChange={(event) => {
                    setTrip(rampartTrips.find(({ id }) => id === event.target.value) ?? rampartTrips[0]);
                    setHighlight(undefined);
                  }}>
                    {rampartTrips.map(({ id, name }) => <option value={id} key={id}>{name}</option>)}
                  </select>
                </label>
                {highlight && <div className="junction-result" role="status">
                  <strong>{trip.via}</strong>
                  <p>{highlight.manual ? "Branch selected on the map." : `Matched “${highlight.evidence}” on the sign.`}</p>
                </div>}
                {manual ? <>
                  <p className="muted">The map highlights {trip.via}. Check it against the sign before confirming.</p>
                  <button type="button" className="secondary-action" onClick={() => {
                    setHighlight({ evidence: "", manual: true });
                    setManual(false);
                    setPhoto(undefined);
                }}>Confirm branch to {trip.name}</button>
                  <button type="button" className="text-action" onClick={() => setManual(false)}>{photo ? "Back to photo" : "Cancel"}</button>
                </> : <>
                  <p className="muted">At the junction, photograph both sign panels so you can check the labels and arrows.</p>
                  <MobileSignReadingNotice />
                  <PhotoPicker onPhoto={openPhoto} cameraLabel="Take sign photo" disabled={sampleLoading} />
                  <button type="button" className="secondary-action" disabled={sampleLoading} onClick={() => void useSample()}>
                    <ScanLine aria-hidden="true" /> {sampleLoading ? "Opening photo…" : "Read NPS sample photo"}
                  </button>
                  <button type="button" className="text-action" onClick={() => setManual(true)}>Choose a marked branch</button>
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
