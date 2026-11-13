import { useId, useState, type CSSProperties, type FormEvent, type RefObject } from "react";
import type { JournalPhoto } from "./journal.ts";
import { PhotoPreview } from "./PhotoPicker.tsx";
import { photoEdges, photoToJpegBlob, type PhotoCrop } from "./photo.ts";

const uncropped: PhotoCrop = { left: 0, top: 0, right: 0, bottom: 0 };

export function JournalPhotoCrop({ photo, dialog, save }: {
  photo: JournalPhoto;
  dialog: RefObject<HTMLDialogElement | null>;
  save: (crop: JournalPhoto["crop"]) => Promise<void>;
}) {
  const title = useId();
  const [bounds, setBounds] = useState(photo.crop?.bounds ?? uncropped);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      onClose={() => { setBounds(photo.crop?.bounds ?? uncropped); setError(""); }}
      onCancel={(event) => { if (saving) event.preventDefault(); }}>
      <form className="journal-form" onSubmit={(event) => void submit(event)}>
        <h3 id={title}>Crop photo</h3>
        <p className="muted">Trim each edge to remove a border. The shaded area will be removed.</p>
        <div className="journal-crop-preview"
          style={{ "--crop-inset": `${bounds.top}% ${bounds.right}% ${bounds.bottom}% ${bounds.left}%` } as CSSProperties}>
          <PhotoPreview photo={photo.image} alt="Original photo with crop preview" />
        </div>
        <div className="journal-crop-fields">
          {photoEdges.map((edge) => (
            <label key={edge}>
              <span>{edge} <span aria-hidden="true">{bounds[edge]}%</span></span>
              <input type="range" min={0} max={45} step={0.5} value={bounds[edge]} aria-valuetext={`${bounds[edge]} percent`} disabled={saving}
                onChange={(event) => {
                  const value = event.currentTarget.valueAsNumber;
                  setBounds((current) => ({ ...current, [edge]: value }));
                }} />
            </label>
          ))}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="journal-actions">
          <button type="submit" className="primary-action" disabled={saving}>Save crop</button>
          <button type="button" className="secondary-action" disabled={saving} onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="button" className="text-action" disabled={saving} onClick={() => setBounds(uncropped)}>Reset edges</button>
        </div>
      </form>
    </dialog>
  );
}
