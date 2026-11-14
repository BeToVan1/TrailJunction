import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Camera, Check, WifiOff } from "lucide-react";
import { fernForkPaths, fernForkSample, findFernForkPath, matchesFernForkSample } from "./fern-fork.ts";
import { aiConfigured, readSign } from "./firebase-ai.ts";
import { PublicHeader } from "./Landing.tsx";
import { OfflineAISetup } from "./OfflineAISetup.tsx";
import { normalizeSignLine } from "./route.ts";
import type { SignArrow } from "./sign-reading.ts";
import { TrailMap } from "./TrailMap.tsx";
import { useOnline } from "./use-online.ts";

const samplePhoto = `${import.meta.env.BASE_URL}signs/fork.png`;
const stepLabels = ["Junction", "Photo", "Destination", "Route"] as const;

interface ForkReading {
  arrows: SignArrow[];
  source: string;
}

const sampleReading: ForkReading = { arrows: fernForkSample, source: "Sample result" };

async function readSamplePhoto(signal: AbortSignal): Promise<ForkReading> {
  try {
    const response = await fetch(samplePhoto, { signal });
    if (!response.ok) return sampleReading;
    const { reading, source } = await readSign(await response.blob(), { signal, timeout: 8000 });
    if (!reading.arrows || !matchesFernForkSample(reading)) return sampleReading;
    return { arrows: reading.arrows, source: source ?? "AI reading" };
  } catch {
    return sampleReading;
  }
}

async function readDemoSign() {
  if (!aiConfigured) return sampleReading;
  const controller = new AbortController();
  let timer: number | undefined;
  const deadline = new Promise<ForkReading>((resolve) => {
    timer = window.setTimeout(() => {
      resolve(sampleReading);
      controller.abort();
    }, 8000);
  });
  try {
    return await Promise.race([readSamplePhoto(controller.signal), deadline]);
  } finally {
    window.clearTimeout(timer);
  }
}

export function ForkDemo() {
  const online = useOnline();
  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<{ path: readonly string[]; arrow: SignArrow; source: string }>();
  const photoReading = useRef<Promise<ForkReading> | undefined>(undefined);
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const focusNextStep = useRef(false);

  useEffect(() => {
    if (!focusNextStep.current) return;
    focusNextStep.current = false;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [step]);

  function show(next: number) {
    focusNextStep.current = true;
    setError("");
    setStep(next);
  }

  function takePhoto() {
    photoReading.current = readDemoSign();
    show(2);
  }

  async function showRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const path = findFernForkPath(destination);
    if (!path) {
      setError(destination.trim() ? "No route to that destination in this demo. Try Rocky Point or Sloan Lake." : "Enter Rocky Point or Sloan Lake.");
      input.current?.focus();
      return;
    }
    setReading(true);
    setError("");
    try {
      const { arrows, source } = await (photoReading.current ?? Promise.resolve(sampleReading));
      const arrow = arrows.find(({ label }) => normalizeSignLine(label) === normalizeSignLine(path[1]));
      if (!arrow) {
        setError("The sign reading couldn’t be matched to this route. Try retaking the photo.");
        return;
      }
      setResult({ path, arrow, source });
      show(3);
    } finally {
      setReading(false);
    }
  }

  function replay() {
    photoReading.current = undefined;
    setDestination("");
    setResult(undefined);
    show(0);
  }

  const route = step === 3 ? result : undefined;
  const activeBranch = route?.arrow.direction;
  const mapLabel = route
    ? `Highlighted route via ${route.path[1]} to ${route.path[2]}.`
    : "You are at Fern Fork.";

  return (
    <div className="public-page fern-demo">
      <PublicHeader label="Sign demo" />
      <main className="fern-body">
        <ol className="fern-steps" aria-label="Walkthrough steps">
          {stepLabels.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined}>{index + 1}. {label}</li>)}
        </ol>
        <div className="map-layout">
          {step === 0 || step === 3 ? <TrailMap confirmedId="fern-fork" branch={activeBranch} description={mapLabel} /> :
            <figure className="fern-visual fern-photo">
              <img src={samplePhoto} alt="Wooden trail sign at Fern Fork. Trailhead points left and Cedar Spur points right." />
              <figcaption>{step === 1 ? "Simulated viewfinder" : "Captured sample photo"}</figcaption>
              {step === 1 && <div className="fern-viewfinder" aria-hidden="true"><span /><span /><span /><span /></div>}
            </figure>}
          <div className="fern-content">
            {step === 0 && <section>
              <p className="public-kicker">Fern Creek Trail · Sample hike</p>
              <h1 ref={heading} tabIndex={-1}>You’ve reached a fork.</h1>
              <p className="fern-copy">Cell service has dropped. You reach Fern Fork with a downloaded map and a sign pointing to the two branches.</p>
              <div className="fern-chips">
                <span><Check aria-hidden="true" /> Map downloaded</span>
                <span><WifiOff aria-hidden="true" /> No service in this scenario</span>
              </div>
              <button type="button" className="public-button" onClick={() => show(1)}>Open camera <Camera aria-hidden="true" /></button>
            </section>}
            {step === 1 && <section>
              <p className="public-kicker">Fern Fork · Camera</p>
              <h1 ref={heading} tabIndex={-1}>Frame the whole sign.</h1>
              <p className="fern-copy">Fit both arrows in the photo so the app can tell which branch leads to each place on the sign.</p>
              <div className="fern-actions">
                <button type="button" className="public-button" onClick={takePhoto}>Take photo <Camera aria-hidden="true" /></button>
                <button type="button" className="public-button public-secondary" onClick={() => show(0)}>Back</button>
              </div>
            </section>}
            {step === 2 && <section>
              <p className="public-kicker">Fern Fork · Photo captured</p>
              <h1 ref={heading} tabIndex={-1}>Where are you headed?</h1>
              <form onSubmit={(event) => void showRoute(event)}>
                <label htmlFor="fern-destination">Destination</label>
                <input ref={input} id="fern-destination" type="text" value={destination} placeholder="Enter a destination"
                  autoComplete="off" aria-describedby={error ? "fern-places fern-error" : "fern-places"}
                  aria-invalid={Boolean(error)} disabled={reading}
                  onChange={(event) => { setDestination(event.target.value); setError(""); }} />
                {error && <p className="fern-error" id="fern-error" role="alert">{error}</p>}
                <p className="fern-places" id="fern-places">Places on your downloaded map</p>
                <div className="fern-picks">
                  {fernForkPaths.map(([, , name]) => <button type="button" key={name} disabled={reading} onClick={() => {
                    setDestination(name);
                    setError("");
                  }}>{name}</button>)}
                </div>
                <div className="fern-actions">
                  <button type="submit" className="public-button" disabled={reading}>
                    {reading ? "Reading sign…" : "Show route"} <ArrowRight aria-hidden="true" />
                  </button>
                  <button type="button" className="public-button public-secondary" disabled={reading} onClick={() => show(1)}>Retake photo</button>
                </div>
                <span className="screen-reader-only" role="status">{reading ? "Reading the sign to find your route." : ""}</span>
              </form>
            </section>}
            {route && <section>
              <p className="public-kicker">Fern Fork · {route.source === "Sample result" ? route.source : `${route.source} sign reading`}</p>
              <h1 ref={heading} tabIndex={-1}>Take the {activeBranch} branch.</h1>
              <p className="fern-copy">Follow the sign toward {route.path[1]}, then continue to {route.path[2]}.</p>
              <p className="fern-trace">{route.path.join(" → ")}</p>
              <div className="fern-actions">
                <button type="button" className="public-button" onClick={() => show(2)}>Change destination</button>
                <button type="button" className="public-button public-secondary" onClick={replay}>Replay</button>
              </div>
            </section>}
          </div>
        </div>
        <footer className="fern-footer">
          <a className="text-action" href="/demo/loop">Open full demo map</a>
          <OfflineAISetup online={online} />
        </footer>
      </main>
    </div>
  );
}
