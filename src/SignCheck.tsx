import { useState } from "react";
import { Check, ScanLine } from "lucide-react";
import { aiConfigured, readSign } from "./firebase-ai.ts";
import { isMobileDevice } from "./mobile-device.ts";
import { MobileSignReadingNotice } from "./MobileSignReadingNotice.tsx";
import { PhotoPicker, PhotoPreview } from "./PhotoPicker.tsx";
import { matchJunction, type JunctionMatch, type RoutePack } from "./route.ts";

const sample = { name: "Cedar Spur", src: "/signs/cedar.png", lines: ["Cedar Spur", "To Fern Fork"] };

type Result = { match: JunctionMatch; lines: string[]; source: string };

export function SignCheck({
  pack, confirm, showMap, showCheckpoints,
}: {
  pack: RoutePack;
  confirm: (id: string) => void;
  showMap: () => void;
  showCheckpoints: () => void;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [result, setResult] = useState<Result>();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");

  function selectPhoto(file: File | null) {
    setPhoto(file);
    setResult(undefined);
    setError("");
  }

  async function checkSign() {
    setError("");
    setResult(undefined);
    if (!photo && !aiConfigured) {
      setResult({
        match: matchJunction(pack, sample.lines),
        lines: sample.lines,
        source: "Sample result",
      });
      return;
    }
    setReading(true);
    try {
      const image = photo ? photo : await fetch(sample.src).then((response) => {
        if (!response.ok) throw new Error("The sample photo could not be loaded.");
        return response.blob();
      });
      const { reading, source } = await readSign(image);
      setResult({
        match: matchJunction(pack, reading.lines),
        lines: reading.lines,
        source: source ?? "AI reading",
      });
    } catch (error) {
      setError(navigator.onLine
        ? error instanceof Error ? error.message : "The sign could not be read. Try another photo."
        : "AI is unavailable offline. Choose a junction manually or reconnect to try again.");
    } finally {
      setReading(false);
    }
  }

  const candidate = result?.match.status === "candidate" ? result.match.junction : undefined;
  return (
    <div className="sign-layout">
      <section className="photo-area" aria-label="Sign photo">
        <PhotoPreview photo={photo} fallback={sample.src} alt={photo ? "Selected trail sign" : sample.name} />
        <PhotoPicker onPhoto={selectPhoto} disabled={reading} />
        {photo && <div className="photo-controls">
          <button type="button" className="text-action" disabled={reading} onClick={() => selectPhoto(null)}>Use demo photo</button>
        </div>}
      </section>
      <section className="trail-sheet result-sheet">
        <div aria-live="polite">
          {!result && (
            <>
              <p className="eyebrow">{photo ? "Selected photo" : "Demo photo"}</p>
              <h2>{photo ? photo.name : sample.name}</h2>
              {aiConfigured && isMobileDevice() ? <MobileSignReadingNotice /> : <p className="muted">{aiConfigured
                ? "If local AI is unavailable, your photo may be processed by Gemini in the cloud."
                : "Live photo checks need a Firebase project. You can try the demo photos and sample results here."}</p>}
            </>
          )}
          {result && (
            <>
              <div className="reading-heading">
                <p className="eyebrow">{candidate ? "Suggested junction" : "More evidence needed"}</p>
                <span className="source">{result.source}</span>
              </div>
              <h2>{candidate?.name ?? (result.match.status === "ambiguous" ? "Multiple junctions match" : "No junction identified")}</h2>
              {result.lines.length > 0 && <p className="muted observed">Sign text: {result.lines.join(" · ")}</p>}
              {!candidate && <p className="muted">Try a clearer sign photo or confirm a known junction to update the map.</p>}
            </>
          )}
          {error && <p role="alert" className="error">{error}</p>}
        </div>
        {candidate ? <button type="button" className="primary-action" onClick={() => confirm(candidate.id)}>
          <Check aria-hidden="true" /> Confirm junction
        </button> : (
          <button type="button" className="primary-action" disabled={reading || Boolean(photo && !aiConfigured)} onClick={() => void checkSign()}>
            <ScanLine aria-hidden="true" /> {reading ? "Reading sign…" : aiConfigured ? "Read sign" : "Show sample result"}
          </button>
        )}
        <div className="sheet-links">
          <button type="button" className="text-action" onClick={showMap}>Back to map</button>
          <button type="button" className="text-action" onClick={showCheckpoints}>Choose a junction</button>
        </div>
      </section>
    </div>
  );
}
