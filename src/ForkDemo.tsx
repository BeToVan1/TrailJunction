import { useState } from "react";
import { ScanLine } from "lucide-react";
import { aiConfigured, readSign } from "./firebase-ai.ts";
import { normalizeSignLine } from "./route.ts";

const destinations = {
  left: "Trailhead",
  right: "Cedar Spur",
} as const;
type Branch = keyof typeof destinations;
const sampleLines = Object.values(destinations);
const samplePhoto = `${import.meta.env.BASE_URL}signs/fork.png`;
const baseDescription = "The approach from Ridge Junction reaches Fern Fork. The left branch goes to Trailhead and the right branch goes to Cedar Spur.";

function ForkMap({ branch }: { branch: Branch | undefined }) {
  return (
    <figure className="map-frame fork-map" data-branch={branch}>
      <svg viewBox="0 0 360 205" role="img" aria-labelledby="fork-map-title fork-map-description">
        <title id="fork-map-title">Two branches at Fern Fork</title>
        <desc id="fork-map-description">
          {baseDescription}
          {branch && ` The highlighted ${branch} branch leads to ${destinations[branch]}.`}
        </desc>
        <path className="fork-contour" d="M-8 77C24 67 57 66 98 80S163 93 204 76 294 64 370 78M-8 89C24 79 57 78 98 92S163 105 204 88 294 76 370 90M-8 101C24 91 57 90 98 104S163 117 204 100 294 88 370 102M-8 156C45 134 81 142 129 158S211 174 251 157 314 145 370 151M-8 169C45 147 81 155 129 171S211 187 251 170 314 158 370 164" />
        <path className="fork-path fork-approach" d="M180 172V115" />
        <path className={branch === "left" ? "fork-path fork-highlight" : "fork-path"} d="M180 115Q162 96 126 82T78 49" />
        <path className={branch === "right" ? "fork-path fork-highlight" : "fork-path"} d="M180 115Q198 96 234 82T282 49" />
        {branch && <path className="fork-chevron" d={branch === "left" ? "M116 70L105 72L110 83" : "M250 83L255 72L244 70"} />}
        <circle className={branch === "left" ? "fork-node fork-destination" : "fork-node"} cx="78" cy="49" r="6" />
        <circle className={branch === "right" ? "fork-node fork-destination" : "fork-node"} cx="282" cy="49" r="6" />
        <circle className="fork-node fork-location" cx="180" cy="115" r="7" />
      </svg>
      <span className="fork-label fork-label-left" aria-hidden="true">Trailhead</span>
      <span className="fork-label fork-label-right" aria-hidden="true">Cedar Spur</span>
      <span className="fork-label fork-label-center" aria-hidden="true">Fern Fork</span>
      <span className="fork-label fork-label-approach" aria-hidden="true">From Ridge Junction</span>
    </figure>
  );
}

export function ForkDemo({ online, showMap }: { online: boolean; showMap: () => void }) {
  const [destination, setDestination] = useState<Branch>("left");
  const [result, setResult] = useState<{ lines: string[]; source: string }>();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  // Sign text is matched to the two branches in the demo map. The photo
  // reader cannot create a new path or select a direction on its own.
  const matched = result?.lines.some((line) => normalizeSignLine(line) === normalizeSignLine(destinations[destination]));
  const branch = matched ? destination : undefined;

  async function checkSign() {
    setReading(true);
    setError("");
    setResult(undefined);
    try {
      if (!aiConfigured) {
        setResult({ lines: sampleLines, source: "Sample result" });
        return;
      }
      const response = await fetch(samplePhoto);
      if (!response.ok) throw new Error("Sample sign unavailable.");
      const { reading: sign, source } = await readSign(await response.blob());
      setResult({ lines: sign.lines, source: source ?? "AI reading" });
    } catch {
      if (!navigator.onLine) setResult({ lines: sampleLines, source: "Sample result" });
      else setError("The sample sign could not be read. Try again.");
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="fork-demo">
      <div className="intro" aria-live="polite">
        <p className="eyebrow">Fern Creek Loop · Fern Fork</p>
        <h1>{branch ? `Take the ${branch} branch` : "Which path should I take?"}</h1>
        <p className="muted">{branch
          ? `Follow the branch marked ${destinations[branch]}.`
          : result ? `The sign reading didn’t match ${destinations[destination]}.`
          : "Pick your destination, then read the sample sign."}</p>
        {result && <span className="source">{result.source}</span>}
      </div>
      <div className="map-layout">
        <div className="fork-choices">
          <label className="fork-destination-picker">
            Destination
            <select value={destination} onChange={(event) => setDestination(event.target.value === "right" ? "right" : "left")}>
              <option value="left">Trailhead</option>
              <option value="right">Cedar Spur</option>
            </select>
          </label>
          <ForkMap branch={branch} />
        </div>
        <section className="trail-sheet fork-actions" aria-label="Sample sign">
          <p className="eyebrow">Sample sign</p>
          <img src={samplePhoto} alt="Trailhead arrow left and Cedar Spur arrow right" />
          {error && <p className="error" role="alert">{error}</p>}
          {result && !matched && <p className="muted">
            {result.lines.length ? `Read from the sign: ${result.lines.join(" · ")}` : "No sign text was readable."}
          </p>}
          <button type="button" className="primary-action" disabled={reading} onClick={() => {
            if (branch) setResult(undefined);
            else void checkSign();
          }}>
            <ScanLine aria-hidden="true" />
            {reading ? "Reading sign…" : branch ? "Replay demo" : "Read sample sign"}
          </button>
          {!online && !result && <p className="muted">The demo uses a sample reading if local AI is unavailable.</p>}
          <button type="button" className="text-action" onClick={showMap}>Open full demo map</button>
        </section>
      </div>
    </div>
  );
}
