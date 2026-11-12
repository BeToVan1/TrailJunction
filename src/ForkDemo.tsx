import { useState } from "react";
import { ScanLine } from "lucide-react";
import { aiConfigured, readSign } from "./firebase-ai.ts";
import { normalizeSignLine } from "./route.ts";

const destinations = {
  left: "Trailhead",
  right: "Cedar Spur",
} as const;
type Branch = keyof typeof destinations;
const sampleLabels = Object.values(destinations).map(normalizeSignLine);
const samplePhoto = `${import.meta.env.BASE_URL}signs/fork.png`;
const sampleResult = "Sample result";
const sampleReadTimeout = 8000;
const baseDescription = "The approach from Ridge Junction reaches Fern Fork. The left branch goes to Trailhead and the right branch goes to Cedar Spur.";

async function readSamplePhoto(signal: AbortSignal) {
  const response = await fetch(samplePhoto, { signal });
  if (!response.ok) throw new Error("Sample sign unavailable.");
  const { reading, source } = await readSign(await response.blob());
  const labels = reading.lines.map(normalizeSignLine);
  return sampleLabels.every((label) => labels.includes(label)) ? source ?? "AI reading" : sampleResult;
}

async function readSampleSign() {
  if (!aiConfigured) return sampleResult;
  const controller = new AbortController();
  let timer: number | undefined;
  const deadline = new Promise<string>((resolve) => {
    timer = window.setTimeout(() => {
      controller.abort();
      resolve(sampleResult);
    }, sampleReadTimeout);
  });
  try {
    return await Promise.race([readSamplePhoto(controller.signal), deadline]);
  } catch {
    return sampleResult;
  } finally {
    window.clearTimeout(timer);
  }
}

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

export function ForkDemo({ showMap }: { showMap: () => void }) {
  const [destination, setDestination] = useState<Branch>("left");
  const [source, setSource] = useState<string>();
  const [reading, setReading] = useState(false);
  const branch = source ? destination : undefined;

  async function checkSign() {
    setReading(true);
    setSource(await readSampleSign());
    setReading(false);
  }

  return (
    <div className="fork-demo">
      <div className="intro" aria-live="polite">
        <p className="eyebrow">Fern Creek Loop · Fern Fork</p>
        <h1>{branch ? `Take the ${branch} branch` : "Which path should I take?"}</h1>
        <p className="muted">{branch
          ? `Follow the branch marked ${destinations[branch]}.`
          : "Pick your destination, then read the sample sign."}</p>
        {source && <span className="source">{source}</span>}
        {source === sampleResult && <p className="muted">Showing the saved reading for this sample sign.</p>}
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
          <button type="button" className="primary-action" disabled={reading} onClick={() => {
            if (branch) setSource(undefined);
            else void checkSign();
          }}>
            <ScanLine aria-hidden="true" />
            {reading ? "Reading sign…" : branch ? "Replay demo" : "Read sample sign"}
          </button>
          <button type="button" className="text-action" onClick={showMap}>Open full demo map</button>
        </section>
      </div>
    </div>
  );
}
