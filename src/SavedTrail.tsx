import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { OfflineAISetup } from "./OfflineAISetup.tsx";
import { OfflineTrailMap } from "./OfflineTrailMap.tsx";
import { PhotoPicker } from "./PhotoPicker.tsx";
import { TrailSignReader } from "./TrailSignReader.tsx";
import type { Trail, TrailMapData } from "./trail-catalog.ts";

export function SavedTrail({ trail, map, online, backLabel, back }: {
  trail: Trail;
  map: TrailMapData;
  online: boolean;
  backLabel: string;
  back: () => void;
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
    <div className="trail-library">
      <div className="intro">
        <button type="button" className="text-action back" onClick={back}>
          <ArrowLeft aria-hidden="true" /> {backLabel}
        </button>
        <p className="eyebrow">{trail.park} · Saved offline</p>
        <h1>{trail.name}</h1>
        <p className="muted">{trail.details}</p>
      </div>
      <section className="trail-sign-tools" aria-label="Trail sign camera">
        <PhotoPicker onPhoto={usePhoto} cameraLabel="Take sign photo" />
        <OfflineAISetup online={online} />
      </section>
      <OfflineTrailMap trail={trail} map={map} />
      {"elevationGain" in trail && (
        <dl className="park-elevation">
          <dt>Elevation gain</dt>
          <dd>{trail.elevationGain}</dd>
        </dl>
      )}
      <a className="park-details" href={trail.info} target="_blank" rel="noreferrer">
        {trail.format === "usgs-topo" ? "USGS Trails Explorer" : "Official trail details"}
      </a>
    </div>
  );
}
