import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, BookOpen, ChevronRight, Images, Plus } from "lucide-react";
import { aiConfigured } from "./firebase-ai.ts";
import { changeHike, deleteHike, getHikes, saveHike, type Hike, type HikeDetails } from "./journal.ts";
import { JournalPhotoCard } from "./JournalPhotoCard.tsx";
import { prepareOfflineApp } from "./offline.ts";
import { PhotoPicker, PhotoPreview } from "./PhotoPicker.tsx";
import { PhotoError, photoToJpegBlob } from "./photo.ts";

export type JournalTrail = Pick<HikeDetails, "trail" | "location">;
type JournalView = { page: "list" } | { page: "hike"; id: string } | { page: "form"; id?: string };

function today() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function hikeDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(`${date}T12:00:00`));
}

export function TrailJournal({ online, trail }: { online: boolean; trail?: JournalTrail }) {
  const [hikes, setHikes] = useState<Hike[]>([]);
  const [view, setView] = useState<JournalView>(() => ({ page: trail ? "form" : "list" }));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const hike = view.page === "list" ? undefined : hikes.find(({ id }) => id === view.id);

  useEffect(() => {
    let active = true;
    void getHikes().then((saved) => {
      if (active) setHikes(saved);
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (online && import.meta.env.PROD) void prepareOfflineApp().catch(() => {});
  }, [online]);

  useEffect(() => {
    if (!loading) heading.current?.focus({ preventScroll: true });
  }, [loading, view]);

  function open(next: JournalView) {
    setView(next);
    setError("");
    setStatus("");
    window.scrollTo(0, 0);
  }

  function remember(next: Hike) {
    setHikes((previous) => [...previous.filter(({ id }) => id !== next.id), next]);
  }

  async function submit(details: HikeDetails) {
    setBusy(true);
    setError("");
    try {
      let next: Hike;
      if (hike) {
        next = await changeHike(hike.id, (current) => ({ ...current, ...details }));
      } else {
        next = { id: crypto.randomUUID(), ...details, photos: [] };
        await saveHike(next);
      }
      remember(next);
      open({ page: "hike", id: next.id });
      setStatus("Hike saved.");
    } catch {
      setError("The hike could not be saved on this device. Check available storage and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addPhoto(file: File, id: string) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const image = await photoToJpegBlob(file);
      const photo = { id: crypto.randomUUID(), image, caption: "" };
      remember(await changeHike(id, (current) => ({ ...current, photos: [...current.photos, photo] })));
      setStatus("Photo saved to this hike.");
    } catch (reason) {
      setError(reason instanceof PhotoError ? reason.message : "The photo could not be saved. Check available storage and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeHike(entry: Hike) {
    if (!window.confirm(`Delete your hike on ${entry.trail} and all its photos?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteHike(entry.id);
      setHikes((previous) => previous.filter(({ id }) => id !== entry.id));
      open({ page: "list" });
      setStatus("Hike deleted.");
    } catch {
      setError("The hike could not be deleted. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const back = (label: string, next: JournalView) => (
    <button type="button" className="text-action back" disabled={busy} onClick={() => open(next)}>
      <ArrowLeft aria-hidden="true" /> {label}
    </button>
  );
  const feedback = error && <p className="error" role="alert">{error}</p>;
  const title = view.page === "form" ? (hike ? "Edit hike" : "Log a hike") : (hike?.trail ?? "Trail journal");

  return (
    <div className="trail-library trail-journal" data-page={view.page}>
      <div className="intro journal-heading">
        {!loading && !loadError && view.page !== "list" && (view.page === "form" && hike
          ? back("Back to hike", { page: "hike", id: hike.id }) : back("All hikes", { page: "list" }))}
        {view.page === "hike" && hike && <p className="eyebrow"><time dateTime={hike.date}>{hikeDate(hike.date)}</time>
          {hike.location && ` · ${hike.location}`}</p>}
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
        {view.page === "list" && <p className="muted">Hikes, notes, and photos saved on this device.</p>}
      </div>
      <p className="screen-reader-only" role="status">{status}</p>
      {loading ? <p className="muted" role="status">Opening your journal…</p>
        : loadError ? <p className="error" role="alert">This browser could not open your journal storage.</p>
        : view.page === "form" ? (
          <>
            <HikeForm initial={hike ?? trail} busy={busy} save={submit} />
            {feedback}
          </>
        ) : view.page === "hike" && hike ? (
          <>
            {hike.notes && <p className="journal-notes">{hike.notes}</p>}
            <div className="journal-actions">
              <button type="button" className="text-action" disabled={busy}
                onClick={() => open({ page: "form", id: hike.id })}>Edit hike</button>
            </div>
            <section className="journal-photo-book" aria-labelledby="photo-book-title">
              <div className="journal-book-tools">
                <h2 id="photo-book-title">Photo book</h2>
                <div className="journal-upload">
                  <PhotoPicker onPhoto={(file) => void addPhoto(file, hike.id)} disabled={busy} />
                </div>
              </div>
              {feedback}
              {hike.photos.some(({ nature }) => !nature) && (
                <p className="muted journal-ai-hint">{!online ? "Connect to ask Gemini about a photo."
                  : !aiConfigured ? "AI nature notes are unavailable on this build."
                  : "Asking Gemini sends the selected photo for a possible plant or wildlife identification."}</p>
              )}
              <div className="journal-photos">
                {!hike.photos.length && (
                  <div className="journal-blank-page">
                    <Images aria-hidden="true" />
                    <p className="muted">{busy ? "Saving photo…" : "Add your first photo from this hike."}</p>
                  </div>
                )}
                {hike.photos.map((photo, index) => (
                  <JournalPhotoCard key={photo.id} photo={photo} number={index + 1} online={online}
                    save={async (patch) => remember(await changeHike(hike.id, (current) => ({
                      ...current,
                      photos: current.photos.map((item) => item.id === photo.id ? { ...item, ...patch } : item),
                    })))}
                    remove={async () => remember(await changeHike(hike.id, (current) => ({
                      ...current, photos: current.photos.filter(({ id }) => id !== photo.id),
                    })))} />
                ))}
              </div>
            </section>
            <button type="button" className="text-action journal-delete" disabled={busy}
              onClick={() => void removeHike(hike)}>Delete hike</button>
          </>
        ) : (
          <>
            <button type="button" className="primary-action journal-new" onClick={() => open({ page: "form" })}>
              <Plus aria-hidden="true" /> Log a hike
            </button>
            {!hikes.length ? (
              <div className="trail-sheet journal-empty">
                <span className="status-icon"><BookOpen aria-hidden="true" /></span>
                <div><h2>No hikes yet</h2><p className="muted">Add a trail name and date to start your first entry.</p></div>
              </div>
            ) : (
              <ul className="journal-hikes">
                {[...hikes].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => (
                  <li key={entry.id} className="journal-hike-card">
                    <button type="button" onClick={() => open({ page: "hike", id: entry.id })}>
                      {entry.photos[0] ? <PhotoPreview photo={entry.photos[0].image} alt="" />
                        : <span className="journal-cover-mark"><BookOpen aria-hidden="true" /></span>}
                      <span className="journal-hike-summary">
                        <span className="eyebrow"><time dateTime={entry.date}>{hikeDate(entry.date)}</time></span>
                        <strong>{entry.trail}</strong>
                        {entry.location && <span className="muted">{entry.location}</span>}
                        <span className="journal-cover-count">{entry.photos.length} {entry.photos.length === 1 ? "photo" : "photos"}</span>
                      </span>
                      <ChevronRight aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
    </div>
  );
}

function HikeForm({ initial, busy, save }: {
  initial?: JournalTrail | Hike;
  busy: boolean;
  save: (details: HikeDetails) => Promise<void>;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const name = event.currentTarget.elements.namedItem("trail") as HTMLInputElement;
    const trail = name.value.trim();
    if (!trail) {
      name.setCustomValidity("Enter the name of your hike or trail.");
      name.reportValidity();
      return;
    }
    void save({
      trail, location: String(fields.get("location")).trim(),
      date: String(fields.get("date")), notes: String(fields.get("notes")).trim(),
    });
  }

  const existing = initial && "id" in initial ? initial : undefined;
  return (
    <form className="trail-sheet journal-form" onSubmit={submit}>
      <label>Trail name
        <input name="trail" required maxLength={120} defaultValue={initial?.trail}
          onInput={(event) => event.currentTarget.setCustomValidity("")} />
      </label>
      <label>Date hiked
        <input name="date" type="date" required max={today()} defaultValue={existing?.date ?? today()} />
      </label>
      <label>Park or area <span className="muted">(optional)</span>
        <input name="location" maxLength={120} defaultValue={initial?.location} />
      </label>
      <label>Hike notes <span className="muted">(optional)</span>
        <textarea name="notes" maxLength={2500} rows={4} defaultValue={existing?.notes} />
      </label>
      <button type="submit" className="primary-action" disabled={busy}>{busy ? "Saving…" : "Save hike"}</button>
    </form>
  );
}
