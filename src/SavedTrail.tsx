import { useState } from "react";
import { ArrowLeft, BookOpen, CircleCheck, Signpost } from "lucide-react";
import { MobileSignReadingNotice } from "./MobileSignReadingNotice.tsx";
import { OfflineAISetup } from "./OfflineAISetup.tsx";
import { OfflineTrailMap } from "./OfflineTrailMap.tsx";
import { PhotoPicker } from "./PhotoPicker.tsx";
import { TrailSignReader } from "./TrailSignReader.tsx";
import type { Trail, TrailMapData } from "./trail-catalog.ts";

export function SavedTrail({ trail, map, online, backLabel, back, logHike }: {
  trail: Trail;
  map: TrailMapData;
  online: boolean;
  backLabel: string;
  back: () => void;
  logHike: () => void;
}) {
  const [capture, setCapture] = useState<{ file: File; revision: number }>();

  function usePhoto(file: File) {
    setCapture((previous) => ({ file, revision: (previous?.revision ?? 0) + 1 }));
    window.scrollTo(0, 0);
  }

  if (capture) {
    return (
      <TrailSignReader key={capture.revision} photo={capture.file} trailName={trail.name}
        onPhoto={usePhoto} back={() => { setCapture(undefined); window.scrollTo(0, 0); }} />
    );
  }

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
        <p className="muted">{trail.details}</p>
      </div>
      <div className="saved-trail-layout">
        <OfflineTrailMap trail={trail} map={map} />
        <div className="saved-trail-tools">
          <section className="trail-sheet trail-sign-tools" aria-labelledby="read-trail-sign-heading">
            <h2 id="read-trail-sign-heading"><Signpost aria-hidden="true" /> Read a trail sign</h2>
            <p className="muted">Include the destinations and their arrows in your photo.</p>
            <MobileSignReadingNotice />
            <PhotoPicker onPhoto={usePhoto} cameraLabel="Take sign photo" />
            <OfflineAISetup online={online} />
          </section>
          <section className="trail-sheet saved-trail-details" aria-label="Trail details">
            {"elevationGain" in trail && (
              <dl className="park-elevation">
                <dt>Elevation gain</dt>
                <dd>{trail.elevationGain}</dd>
              </dl>
            )}
            <button type="button" className="secondary-action trail-log-action" onClick={logHike}>
              <BookOpen aria-hidden="true" /> Log this hike
            </button>
            <a className="park-details" href={trail.info} target="_blank" rel="noreferrer">
              {trail.format === "usgs-topo" ? "USGS Trails Explorer" : "Official trail details"}
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
