import { useId, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import type { JournalPhoto } from "./journal.ts";
import { PhotoPreview } from "./PhotoPicker.tsx";
import { photoEdges, photoToJpegBlob, type PhotoCrop } from "./photo.ts";

const uncropped: PhotoCrop = { left: 0, top: 0, right: 0, bottom: 0 };
const corners = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
type CropHandle = "move" | (typeof corners)[number];

function adjustCrop(bounds: PhotoCrop, handle: CropHandle, x: number, y: number): PhotoCrop {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  if (handle === "move") {
    const dx = clamp(x, -bounds.left, bounds.right);
    const dy = clamp(y, -bounds.top, bounds.bottom);
    return { left: bounds.left + dx, right: bounds.right - dx, top: bounds.top + dy, bottom: bounds.bottom - dy };
  }
  const horizontal = handle.endsWith("left") ? "left" : "right";
  const vertical = handle.startsWith("top") ? "top" : "bottom";
  const oppositeX = horizontal === "left" ? "right" : "left";
  const oppositeY = vertical === "top" ? "bottom" : "top";
  return {
    ...bounds,
    [horizontal]: clamp(bounds[horizontal] + (horizontal === "left" ? x : -x), 0, 92 - bounds[oppositeX]),
    [vertical]: clamp(bounds[vertical] + (vertical === "top" ? y : -y), 0, 92 - bounds[oppositeY]),
  };
}

export function JournalPhotoCrop({ photo, dialog, save }: {
  photo: JournalPhoto;
  dialog: RefObject<HTMLDialogElement | null>;
  save: (crop: JournalPhoto["crop"]) => Promise<void>;
}) {
  const title = useId();
  const instructions = useId();
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; handle: CropHandle; bounds: PhotoCrop; x: number; y: number }>(null);
  const [bounds, setBounds] = useState(photo.crop?.bounds ?? uncropped);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startDrag(event: PointerEvent<HTMLElement>, handle: CropHandle) {
    if (saving || drag.current || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, handle, bounds, x: event.clientX, y: event.clientY };
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    const start = drag.current;
    const image = surface.current?.querySelector("img");
    if (!start || start.pointer !== event.pointerId || !image) return;
    const { width, height } = image.getBoundingClientRect();
    if (!width || !height) return;
    setBounds(adjustCrop(start.bounds, start.handle,
      (event.clientX - start.x) * 100 / width, (event.clientY - start.y) * 100 / height));
  }

  function stopDrag(event: PointerEvent<HTMLElement>) {
    if (drag.current?.pointer !== event.pointerId) return;
    if (event.type === "pointerup") moveDrag(event);
    drag.current = null;
  }

  function nudge(event: KeyboardEvent<HTMLElement>, handle: CropHandle) {
    if (saving || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 5 : .5;
    const x = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const y = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    setBounds((current) => adjustCrop(current, handle, x, y));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const crop = photoEdges.some((edge) => bounds[edge] > 0)
        ? { bounds, image: await photoToJpegBlob(photo.image, bounds) }
        : undefined;
      await save(crop);
      dialog.current?.close();
    } catch {
      setError("The crop could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} className="journal-note-dialog journal-crop-dialog" aria-labelledby={title}
      onClose={() => { drag.current = null; setBounds(photo.crop?.bounds ?? uncropped); setError(""); }}
      onCancel={(event) => { if (saving) event.preventDefault(); }}>
      <form className="journal-form" onSubmit={(event) => void submit(event)}>
        <h3 id={title}>Crop photo</h3>
        <p id={instructions} className="muted">Drag a corner to resize the crop, or drag inside the box to move it.
          <span className="screen-reader-only"> You can also use the arrow keys on the box or a corner.</span>
        </p>
        <div className="journal-crop-preview">
          <div ref={surface} className="journal-crop-surface"
            style={{ "--crop-inset": `${bounds.top}% ${bounds.right}% ${bounds.bottom}% ${bounds.left}%` } as CSSProperties}
            onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}>
            <PhotoPreview photo={photo.image} alt="Original photo with crop preview" />
            <div className="journal-crop-mask" aria-hidden="true"><span /></div>
            <div className="journal-crop-box" role="group" tabIndex={saving ? -1 : 0}
              aria-label="Move crop box" aria-describedby={instructions}
              onPointerDown={(event) => { if (event.target === event.currentTarget) startDrag(event, "move"); }}
              onKeyDown={(event) => { if (event.target === event.currentTarget) nudge(event, "move"); }}>
              {corners.map((corner) => (
                <button key={corner} type="button" className="journal-crop-handle" data-corner={corner}
                  aria-label={`Resize ${corner} corner`} disabled={saving}
                  onPointerDown={(event) => startDrag(event, corner)} onKeyDown={(event) => nudge(event, corner)} />
              ))}
            </div>
          </div>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="journal-actions">
          <button type="submit" className="primary-action" disabled={saving}>Save crop</button>
          <button type="button" className="secondary-action" disabled={saving} onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="button" className="text-action" disabled={saving} onClick={() => setBounds(uncropped)}>Reset crop</button>
        </div>
      </form>
    </dialog>
  );
}
