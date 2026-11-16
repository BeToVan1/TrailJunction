import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, Camera, ScanLine } from "lucide-react";
import { aiConfigured, readSign } from "./firebase-ai.ts";
import { isMobileDevice } from "./mobile-device.ts";
import { MobileSignReadingNotice } from "./MobileSignReadingNotice.tsx";
import { PhotoPicker, PhotoPreview } from "./PhotoPicker.tsx";
import { PhotoError } from "./photo.ts";
import { SampleSignFrame } from "./SampleSignFrame.tsx";
import { describeSign, readingFromEntries, type SignEntry, type SignReading } from "./sign-reading.ts";
import { SignReviewEditor } from "./SignReviewEditor.tsx";

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

type TrailSignReaderProps = {
  photo: File;
  trailName: string;
  back: () => void;
} & ({
  onPhoto: (file: File) => void;
  mapReview?: (entries: readonly SignEntry[]) => ReactNode;
  sample?: never;
} | {
  onPhoto?: never;
  mapReview?: never;
  sample: {
    src: string;
    alt: string;
    credit: string;
    retake: () => void;
    destination: string;
    labelKey: (label: string) => string;
    verifyArrows: (entries: readonly SignEntry[]) => SignEntry[];
    onConfirm: (entries: readonly SignEntry[]) => string | undefined;
    chooseBranch: () => void;
  };
});

export function TrailSignReader({ photo, trailName, onPhoto, back, sample, mapReview }: TrailSignReaderProps) {
  const [result, setResult] = useState<{ reading: SignReading; source?: string }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [corrected, setCorrected] = useState<SignEntry[]>();
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
    setCorrected(undefined);
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

  const reading = corrected ? readingFromEntries(corrected) : result?.reading;
  const sign = reading && describeSign(reading, trailName, sample?.labelKey);
  const observed = sign?.entries ?? [];
  const verified = !corrected && sample ? sample.verifyArrows(observed) : observed;
  const entries = corrected ?? verified;
  const arrowsCorrected = verified.some((entry, index) => entry.direction !== observed[index].direction);
  const source = corrected ? "Reviewed by you" : result?.source;

  return (
    <div className="trail-library trail-sign-reader">
      <div className="intro">
        <button type="button" className="text-action back" onClick={back}><ArrowLeft aria-hidden="true" /> Back to map</button>
        <p className="eyebrow">{trailName}</p>
        <h1 ref={heading} tabIndex={-1}>{sample ? "Read the captured sign" : "Read a trail sign"}</h1>
        <p className="muted">{sample ? `Destination: ${sample.destination}` : "Keep the lettering and arrows in view."}</p>
      </div>
      <div className="saved-trail-layout">
        <div className="trail-sheet sign-photo-panel">
          <div className="sign-capture" data-reading={busy ? "" : undefined} data-sample={sample ? "" : undefined}>
            {sample ? <SampleSignFrame src={sample.src} alt={sample.alt} /> :
              <PhotoPreview photo={photo} alt="Your trail sign photo" />}
          </div>
          {sample ? <>
            <a className="park-details" href={sample.credit} target="_blank" rel="noreferrer">Sample photo by the National Park Service</a>
            <button type="button" className="secondary-action" disabled={busy || editing} onClick={sample.retake}>
              <Camera aria-hidden="true" /> Retake photo
            </button>
          </> : <PhotoPicker onPhoto={onPhoto} cameraLabel="Retake photo" primaryCamera={false} disabled={busy || editing} />}
        </div>
        <section className="trail-sheet result-sheet" aria-label="Sign reading">
        {editing ? <SignReviewEditor entries={entries} cancel={() => setEditing(false)} confirm={(reviewed) => {
          setCorrected(reviewed);
          setEditing(false);
          setError("");
        }} /> : <>
        {sign && (
          <div className="sign-reading-result" aria-live="polite">
            <div className="reading-heading">
              <h2>{sign.entries.length ? "What the sign says" : "No clear sign text"}</h2>
              {source && <span className="source">{source}</span>}
            </div>
            {sign.entries.length ? (
              <>
                <ul className="sign-lines">
                  {entries.map(({ label, direction }, index) => {
                    const arrow = direction ? arrows[direction] : undefined;
                    return <li key={index}>
                      <span>{label}</span>
                      {arrow && <span className="sign-direction"><arrow.Icon aria-hidden="true" /> {arrow.title}</span>}
                    </li>;
                  })}
                </ul>
                {arrowsCorrected && <p className="muted">Longmire arrows checked against the NPS sample photo.</p>}
                {sign.namesTrail && !mapReview && <p className="muted">This sign names the trail on your downloaded map.</p>}
                <p className="muted">Compare the labels and arrows with your photo.</p>
              </>
            ) : <p className="muted">{sample
              ? "Check the sample photo and enter the labels and arrows you can see."
              : "Retake the photo closer to the sign and include the full label."}</p>}
          </div>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        {!sign && !error && (isMobileDevice() ? <MobileSignReadingNotice /> :
          <p className="muted">When you tap Read sign, Gemini may process the photo online if on-device AI is unavailable.</p>)}
        {!aiConfigured && <p className="muted">Sign reading requires a configured Firebase project.</p>}
        {(!sign || !sign.entries.length) && (
          <button type="button" className="primary-action" disabled={busy || !aiConfigured} onClick={() => void analyze()}>
            <ScanLine aria-hidden="true" /> {busy ? "Reading sign…" : error ? "Retry reading" : "Read sign"}
          </button>
        )}
        {mapReview && entries.length > 0 && mapReview(entries)}
        {sample && sign && entries.length > 0 && (
          <button type="button" className="primary-action" onClick={() => setError(sample.onConfirm(entries) ?? "")}>Use this reading</button>
        )}
        {!busy && <div className="sheet-links">
          <button type="button" className="text-action" onClick={() => setEditing(true)}>
            {entries.length ? "Edit labels and arrows" : "Enter sign text manually"}
          </button>
          {sample && <button type="button" className="text-action" onClick={sample.chooseBranch}>Choose a marked branch</button>}
        </div>}
        </>}
        <span className="screen-reader-only" role="status">{busy ? "Reading your sign photo." : sign ? "Sign reading finished." : ""}</span>
        </section>
      </div>
    </div>
  );
}
