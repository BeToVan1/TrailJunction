import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ScanLine } from "lucide-react";
import { aiConfigured, readSign } from "./firebase-ai.ts";
import { PhotoPicker, PhotoPreview } from "./PhotoPicker.tsx";
import { PhotoError } from "./photo.ts";
import { describeSign, type SignReading } from "./sign-reading.ts";

const arrows = {
  left: { Icon: ArrowLeft, title: "Left" },
  right: { Icon: ArrowRight, title: "Right" },
  straight: { Icon: ArrowUp, title: "Straight ahead" },
};

function readError(reason: unknown) {
  if (reason instanceof PhotoError) return reason.message;
  if (!navigator.onLine) {
    return "Offline sign reading is unavailable on this device. Keep the photo open and try again when you reconnect.";
  }
  if (reason instanceof Error && (reason.name === "TimeoutError" || reason.name === "AbortError")) {
    return "Sign reading took too long. Try again.";
  }
  return "Sign reading is unavailable right now. Try again in a moment.";
}

export function TrailSignReader({ photo, trailName, onPhoto, back }: {
  photo: File;
  trailName: string;
  onPhoto: (file: File) => void;
  back: () => void;
}) {
  const [result, setResult] = useState<{ reading: SignReading; source?: string }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    return () => active.current?.abort();
  }, []);

  async function analyze() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setResult(undefined);
    // Bound the entire attempt, including model initialization and photo decoding.
    const timer = window.setTimeout(() => controller.abort(new DOMException("Sign reading timed out.", "TimeoutError")), 35000);
    const deadline = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
    });
    try {
      const reading = await Promise.race([readSign(photo, { signal: controller.signal }), deadline]);
      if (!controller.signal.aborted) setResult(reading);
    } catch (reason) {
      if (!controller.signal.aborted || (reason instanceof Error && reason.name === "TimeoutError")) {
        setError(readError(reason));
      }
    } finally {
      window.clearTimeout(timer);
      active.current = null;
      if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError") setBusy(false);
    }
  }

  const sign = result && describeSign(result.reading, trailName);

  return (
    <div className="trail-library trail-sign-reader">
      <div className="intro">
        <button type="button" className="text-action back" onClick={back}><ArrowLeft aria-hidden="true" /> Back to map</button>
        <p className="eyebrow">{trailName}</p>
        <h1 ref={heading} tabIndex={-1}>Read a trail sign</h1>
        <p className="muted">Keep the lettering and arrows in view.</p>
      </div>
      <div className="saved-trail-layout">
        <div className="trail-sheet sign-photo-panel">
          <PhotoPreview photo={photo} alt="Your trail sign photo" />
          <PhotoPicker onPhoto={onPhoto} cameraLabel="Retake photo" primaryCamera={false} disabled={busy} />
        </div>
        <section className="trail-sheet result-sheet" aria-label="Sign reading">
        {sign && (
          <div aria-live="polite">
            <div className="reading-heading">
              <h2>{sign.entries.length ? "What the sign says" : "No clear sign text"}</h2>
              {result?.source && <span className="source">{result.source}</span>}
            </div>
            {sign.entries.length ? (
              <>
                <ul className="sign-lines">
                  {sign.entries.map(({ label, direction }) => {
                    const arrow = direction ? arrows[direction] : undefined;
                    return <li key={label}>
                      <span>{label}</span>
                      {arrow && <span className="sign-direction"><arrow.Icon aria-hidden="true" /> {arrow.title}</span>}
                    </li>;
                  })}
                </ul>
                {sign.namesTrail && <p className="muted">This sign names the trail on your downloaded map.</p>}
                <p className="muted">Directions describe the arrows in the photo. Check the sign and your map before choosing a path.</p>
              </>
            ) : <p className="muted">Retake the photo closer to the sign and include the full label.</p>}
          </div>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        {!sign && !error && <p className="muted">When you tap Read sign, Gemini may process the photo online if on-device AI is unavailable.</p>}
        {!aiConfigured && <p className="muted">Sign reading requires a configured Firebase project.</p>}
        {(!sign || !sign.entries.length) && (
          <button type="button" className="primary-action" disabled={busy || !aiConfigured} onClick={() => void analyze()}>
            <ScanLine aria-hidden="true" /> {busy ? "Reading sign…" : error ? "Retry reading" : "Read sign"}
          </button>
        )}
        <span className="screen-reader-only" role="status">{busy ? "Reading your sign photo." : sign ? "Sign reading finished." : ""}</span>
        </section>
      </div>
    </div>
  );
}
