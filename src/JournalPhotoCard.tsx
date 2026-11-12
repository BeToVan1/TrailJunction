import { useEffect, useRef, useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { aiConfigured, describeNaturePhoto } from "./firebase-ai.ts";
import type { JournalPhoto } from "./journal.ts";
import { PhotoPreview } from "./PhotoPicker.tsx";

export function JournalPhotoCard({ photo, number, online, save, remove }: {
  photo: JournalPhoto;
  number: number;
  online: boolean;
  save: (patch: Partial<Pick<JournalPhoto, "caption" | "nature">>) => Promise<void>;
  remove: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState<"gemini" | "save" | "remove">();
  const [error, setError] = useState("");
  const request = useRef<AbortController>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function saveCaption(event: FormEvent) {
    event.preventDefault();
    setBusy("save");
    setError("");
    try {
      await save({ caption: caption.trim() });
      setEditing(false);
    } catch {
      setError("The caption could not be saved. Try again.");
    } finally {
      setBusy(undefined);
    }
  }

  async function askGemini() {
    if (request.current || !online || !aiConfigured) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy("gemini");
    setError("");
    let received = false;
    try {
      const nature = await describeNaturePhoto(photo.image, controller.signal);
      controller.signal.throwIfAborted();
      received = true;
      await save({ nature });
    } catch {
      if (!controller.signal.aborted) {
        setError(received ? "The nature note could not be saved. Try again."
          : !navigator.onLine ? "Reconnect to ask Gemini about this photo."
          : "Gemini couldn’t describe this photo. Try again in a moment.");
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(undefined);
    }
  }

  async function removePhoto() {
    if (!window.confirm("Remove this photo and its notes from the hike?")) return;
    setBusy("remove");
    setError("");
    try {
      await remove();
    } catch {
      setError("The photo could not be removed. Try again.");
      setBusy(undefined);
    }
  }

  return (
    <article className="journal-photo-card" aria-label={`Photo ${number}`}>
      <PhotoPreview photo={photo.image} alt={photo.caption || `Hike photo ${number}`} />
      <div className="journal-card-body">
        {photo.caption && !editing && <p className="journal-caption">{photo.caption}</p>}
        {editing && (
          <form className="journal-form" onSubmit={(event) => void saveCaption(event)}>
            <label>Photo caption
              <input value={caption} maxLength={160} onChange={(event) => setCaption(event.target.value)} />
            </label>
            <div className="journal-actions">
              <button type="submit" className="primary-action" disabled={Boolean(busy)}>Save caption</button>
              <button type="button" className="secondary-action" disabled={Boolean(busy)} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
        {photo.nature && (
          <div className="nature-note">
            <p className="eyebrow"><Sparkles aria-hidden="true" /> Gemini nature note</p>
            <h3>{photo.nature.label}</h3>
            <p>{photo.nature.note}</p>
            <p className="muted">AI identification can be mistaken.</p>
          </div>
        )}
        {!photo.nature && !editing && (
          <>
            <button type="button" className="secondary-action" disabled={Boolean(busy) || !online || !aiConfigured}
              onClick={() => void askGemini()}>
              <Sparkles aria-hidden="true" /> {busy === "gemini" ? "Asking Gemini…" : "Ask Gemini about this photo"}
            </button>
            <p className="muted">{!online ? "Connect to the internet to add an AI nature note."
              : !aiConfigured ? "AI nature notes are unavailable on this build."
              : "This sends the photo to Gemini for a possible plant or wildlife identification."}</p>
          </>
        )}
        <span className="screen-reader-only" role="status">{busy === "gemini" ? "Gemini is reading this photo." : ""}</span>
        {error && <p className="error" role="alert">{error}</p>}
        {!editing && <div className="journal-actions">
          <button type="button" className="text-action" disabled={Boolean(busy)}
            onClick={() => { setCaption(photo.caption); setEditing(true); setError(""); }}>
            {photo.caption ? "Edit caption" : "Add caption"}
          </button>
          <button type="button" className="text-action" disabled={Boolean(busy)} onClick={() => void removePhoto()}>Remove photo</button>
        </div>}
      </div>
    </article>
  );
}
