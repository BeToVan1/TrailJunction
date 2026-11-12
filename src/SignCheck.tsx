import { useEffect, useState } from "react";
import { Camera, Check, ImagePlus, ScanLine } from "lucide-react";
import { aiConfigured, readSign } from "./firebase-ai.ts";
import { matchJunction, type JunctionMatch, type RoutePack } from "./route.ts";

const samples = [
  { name: "Cedar Spur", src: "/signs/cedar.png", lines: ["Cedar Spur", "To Fern Fork"] },
  { name: "Ridge Junction", src: "/signs/ridge.png", lines: ["Ridge Junction"] },
  { name: "Shared junction sign", src: "/signs/junction.png", lines: ["Trail Junction"] },
];

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
  const [previewUrl, setPreviewUrl] = useState("");
  const [sample, setSample] = useState(0);
  const [result, setResult] = useState<Result>();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const selectedSample = samples[sample];

  useEffect(() => {
    if (!photo) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

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
        match: matchJunction(pack, selectedSample.lines),
        lines: selectedSample.lines,
        source: "Sample result",
      });
      return;
    }
    setReading(true);
    try {
      const image = photo ? photo : await fetch(selectedSample.src).then((response) => {
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
        <div className="photo-frame">
          {photo && !previewUrl ? <div className="photo-placeholder"><Camera /> Preparing photo</div> :
            <img src={photo ? previewUrl : selectedSample.src} alt={photo ? "Selected trail sign" : selectedSample.name} />}
        </div>
        <div className="photo-controls">
          <label className="file-button secondary-action">
            <ImagePlus aria-hidden="true" /> Choose photo
            <input type="file" accept="image/*,.heic,.heif" disabled={reading} aria-label="Choose a trail sign photo" onChange={(event) => {
              selectPhoto(event.currentTarget.files?.[0] ?? null);
              event.currentTarget.value = "";
            }} />
          </label>
          <label className="sample-select">
            <span>Demo photos</span>
            <select value={sample} disabled={reading} onChange={(event) => {
              setSample(Number(event.target.value));
              selectPhoto(null);
            }}>
              {samples.map(({ name }, index) => <option value={index} key={name}>{name}</option>)}
            </select>
          </label>
          {photo && <button type="button" className="text-action" disabled={reading} onClick={() => selectPhoto(null)}>Use demo photo</button>}
        </div>
      </section>
      <section className="trail-sheet result-sheet">
        <div aria-live="polite">
          {!result && (
            <>
              <p className="eyebrow">{photo ? "Selected photo" : "Demo photo"}</p>
              <h2>{photo ? photo.name : selectedSample.name}</h2>
              <p className="muted">{aiConfigured
                ? "If local AI is unavailable, your photo may be processed by Gemini in the cloud."
                : "Live photo checks need a Firebase project. You can try the demo photos and sample results here."}</p>
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
