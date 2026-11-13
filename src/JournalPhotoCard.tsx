import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Maximize2, Pencil, Sparkles, X } from "lucide-react";
import { aiConfigured, describeNaturePhoto } from "./firebase-ai.ts";
import type { JournalPhoto } from "./journal.ts";
import { PhotoPreview } from "./PhotoPicker.tsx";

export function JournalPhotoCard({ photo, number, online, visible, preparePreview, save, remove }: {
  photo: JournalPhoto;
  number: number;
  online: boolean;
  visible: boolean;
  preparePreview: boolean;
  save: (patch: Partial<Pick<JournalPhoto, "caption" | "nature">>) => Promise<void>;
  remove: () => Promise<void>;
}) {
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState<"gemini" | "save" | "remove">();
  const [error, setError] = useState("");
  const [captionError, setCaptionError] = useState("");
  const request = useRef<AbortController>(null);
  const captionDialog = useRef<HTMLDialogElement>(null);
  const captionInput = useRef<HTMLInputElement>(null);
  const captionTitle = useId();
  const photoDialog = useRef<HTMLDialogElement>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const noteDialog = useRef<HTMLDialogElement>(null);
  const noteTitle = useId();
  const photoLabel = photo.caption || `Hike photo ${number}`;

  useEffect(() => () => request.current?.abort(), []);

  function editCaption() {
    setCaption(photo.caption);
    setCaptionError("");
    captionDialog.current?.showModal();
    captionInput.current?.focus();
  }

  async function saveCaption(event: FormEvent) {
    event.preventDefault();
    setBusy("save");
    setCaptionError("");
    try {
      await save({ caption: caption.trim() });
      captionDialog.current?.close();
    } catch {
      setCaptionError("The caption could not be saved. Try again.");
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
    <article className="journal-photo-card" hidden={!visible} aria-label={`Photo ${number}`}>
      {preparePreview && (
        <figure className="journal-print">
          <button type="button" className="journal-enlarge-photo" aria-label={`View larger: ${photoLabel}`}
            aria-haspopup="dialog" onClick={() => {
              photoDialog.current?.showModal();
              setViewerOpen(true);
            }}>
            <PhotoPreview photo={photo.image} alt={photoLabel} />
            <span className="journal-enlarge-icon" aria-hidden="true"><Maximize2 /></span>
          </button>
          <figcaption className="journal-caption-row">
            {photo.caption && <span className="journal-caption">{photo.caption}</span>}
            <button type="button" className="journal-edit-caption" disabled={Boolean(busy)}
              aria-label={photo.caption ? "Edit caption" : "Add caption"} aria-haspopup="dialog" onClick={editCaption}>
              <Pencil aria-hidden="true" /> {!photo.caption && "Add caption"}
            </button>
          </figcaption>
        </figure>
      )}
      <dialog ref={captionDialog} className="journal-note-dialog journal-caption-dialog" aria-labelledby={captionTitle}>
        <form className="journal-form" onSubmit={(event) => void saveCaption(event)}>
          <h3 id={captionTitle}>{photo.caption ? "Edit caption" : "Add caption"}</h3>
          <label>Photo caption
            <input ref={captionInput} value={caption} maxLength={160} onChange={(event) => setCaption(event.target.value)} />
          </label>
          {captionError && <p className="error" role="alert">{captionError}</p>}
          <div className="journal-actions">
            <button type="submit" className="primary-action" disabled={Boolean(busy)}>Save caption</button>
            <button type="button" className="secondary-action" disabled={Boolean(busy)}
              onClick={() => captionDialog.current?.close()}>Cancel</button>
          </div>
        </form>
      </dialog>
      <dialog ref={photoDialog} className="journal-photo-viewer" aria-label={`Enlarged photo ${number}`}
        onClose={() => setViewerOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <figure className="journal-viewer-content">
          <button type="button" className="journal-viewer-close" aria-label="Close photo"
            onClick={() => photoDialog.current?.close()}><X aria-hidden="true" /></button>
          {viewerOpen && <PhotoPreview photo={photo.image} alt={photoLabel} />}
          {photo.caption && <figcaption>{photo.caption}</figcaption>}
        </figure>
      </dialog>
      <div className="journal-card-body">
        <div className="journal-photo-actions">
          {photo.nature ? (
            <button type="button" className="secondary-action journal-gemini" onClick={() => noteDialog.current?.showModal()}>
              <Sparkles aria-hidden="true" /> Read Gemini note
            </button>
          ) : (
            <button type="button" className="secondary-action journal-gemini" disabled={Boolean(busy) || !online || !aiConfigured}
              onClick={() => void askGemini()}>
              <Sparkles aria-hidden="true" /> {busy === "gemini" ? "Asking Gemini…" : "Ask Gemini about this photo"}
            </button>
          )}
          <button type="button" className="secondary-action journal-remove-photo" disabled={Boolean(busy)}
            aria-label="Remove photo" title="Remove photo" onClick={() => void removePhoto()}>
            <X aria-hidden="true" />
          </button>
        </div>
        {photo.nature && (
            <dialog ref={noteDialog} className="journal-note-dialog" aria-labelledby={noteTitle}>
              <div className="journal-note-header">
                <p className="eyebrow"><Sparkles aria-hidden="true" /> Gemini nature note</p>
                <button type="button" className="text-action" aria-label="Close Gemini note"
                  onClick={() => noteDialog.current?.close()}><X aria-hidden="true" /></button>
              </div>
              <h3 id={noteTitle}>{photo.nature.label}</h3>
              <p>{photo.nature.note}</p>
              <p className="muted">AI identification can be mistaken.</p>
            </dialog>
        )}
        <span className="screen-reader-only" role="status">{busy === "gemini" ? "Gemini is reading this photo." : ""}</span>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </article>
  );
}
