import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type PointerEvent, type ReactNode, type TouchEvent } from "react";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Images, MapPin, Plus } from "lucide-react";
import { aiConfigured } from "./firebase-ai.ts";
import { deviceJournal, type Hike, type HikeDetails, type JournalStore } from "./journal.ts";
import { JournalPhotoCard } from "./JournalPhotoCard.tsx";
import { capturePageTurn, playPageTurn, startPageDrag, type PageCorner } from "./journal-page-turn.ts";
import { prepareOfflineApp } from "./offline.ts";
import { PhotoPicker, PhotoPreview } from "./PhotoPicker.tsx";
import { PhotoError, photoEdges, photoToJpegBlob } from "./photo.ts";

export type JournalTrail = Pick<HikeDetails, "trail" | "location">;
type JournalView = { page: "list" } | { page: "hike"; id: string } | { page: "form"; id?: string };

const singlePageQuery = window.matchMedia("(width < 760px), (hover: none) and (pointer: coarse)");

function watchPageLayout(onChange: () => void) {
  singlePageQuery.addEventListener("change", onChange);
  return () => singlePageQuery.removeEventListener("change", onChange);
}

function today() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function hikeDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(`${date}T12:00:00`));
}

export function TrailJournal({ online, trail, store = deviceJournal, accountPanel, accountLoading, revision, onChange }: {
  online: boolean;
  trail?: JournalTrail;
  store?: JournalStore;
  accountPanel?: ReactNode;
  accountLoading?: boolean;
  revision?: number;
  onChange?: () => void;
}) {
  const { changeHike, deleteHike, getHikes, saveHike } = store;
  const [hikes, setHikes] = useState<Hike[]>([]);
  const [view, setView] = useState<JournalView>(() => ({ page: trail ? "form" : "list" }));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  const pendingTurn = useRef<ReturnType<typeof capturePageTurn>>(undefined);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    target: number;
    surface: NonNullable<ReturnType<typeof startPageDrag>>;
    settling: boolean;
  }>(null);
  const singlePage = useSyncExternalStore(watchPageLayout, () => singlePageQuery.matches);
  const heading = useRef<HTMLHeadingElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number }>(null);
  const suppressPhotoClick = useRef(false);
  const hike = view.page === "list" ? undefined : hikes.find(({ id }) => id === view.id);
  const photoCount = hike?.photos.length ?? 0;
  const currentPhoto = Math.max(0, Math.min(photoIndex, photoCount - 1));
  const pageSize = singlePage ? 1 : 2;
  const firstPhoto = Math.floor(currentPhoto / pageSize) * pageSize;
  const endPhoto = Math.min(firstPhoto + pageSize, photoCount);
  const stripSize = 5;
  const stripStart = Math.max(0, Math.min(currentPhoto - 2, photoCount - stripSize));
  const readRevision = view.page === "list" ? revision : undefined;
  const orderedHikes = view.page === "list" ? [...hikes].sort((a, b) => b.date.localeCompare(a.date)) : [];

  useEffect(() => {
    let active = true;
    void getHikes().then((saved) => {
      if (active) {
        setHikes(saved);
        setLoadError(false);
      }
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [getHikes, readRevision]);

  useEffect(() => {
    if (online && import.meta.env.PROD) void prepareOfflineApp().catch(() => {});
  }, [online]);

  useEffect(() => {
    if (!loading) heading.current?.focus({ preventScroll: true });
  }, [loading, view]);

  useLayoutEffect(() => {
    const turn = pendingTurn.current;
    pendingTurn.current = undefined;
    if (turn && pages.current) return playPageTurn(pages.current, turn);
  }, [firstPhoto, singlePage, photoCount]);

  useLayoutEffect(() => cancelPageDrag, [firstPhoto, singlePage, photoCount, view]);

  function cancelPageDrag() {
    drag.current?.surface.dispose();
    drag.current = null;
  }

  function open(next: JournalView) {
    const currentId = view.page === "list" ? undefined : view.id;
    const nextId = next.page === "list" ? undefined : next.id;
    if (currentId !== nextId) setPhotoIndex(0);
    pendingTurn.current = undefined;
    setView(next);
    setError("");
    setStatus("");
    window.scrollTo(0, 0);
  }

  function remember(next: Hike) {
    onChange?.();
    setHikes((previous) => {
      // IndexedDB clones Blobs on reads. Reuse in-memory photos with the same ID,
      // since changing captions, notes, or hike details never changes their images.
      const existing = previous.find(({ id }) => id === next.id);
      const existingPhotos = new Map(existing?.photos.map((photo) => [photo.id, photo]));
      const photos = next.photos.map((photo) => {
        const before = existingPhotos.get(photo.id);
        const crop = photo.crop;
        const savedCrop = before?.crop;
        const sameCrop = crop && savedCrop && photoEdges.every((edge) => crop.bounds[edge] === savedCrop.bounds[edge]);
        return { ...photo, image: before?.image ?? photo.image, crop: sameCrop ? savedCrop : crop };
      });
      return [...previous.filter(({ id }) => id !== next.id), { ...next, photos }];
    });
  }

  function goToPhoto(next: number) {
    if (next < 0 || next >= photoCount || next === currentPhoto) return;
    cancelPageDrag();
    if (pages.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pendingTurn.current = capturePageTurn(pages.current, next > currentPhoto, !singlePage);
    }
    setPhotoIndex(next);
  }

  function turnPage(delta: number) {
    goToPhoto(firstPhoto + delta * pageSize);
  }

  function grabCorner(event: PointerEvent<HTMLSpanElement>, forward: boolean, corner: PageCorner) {
    if (event.button !== 0 || !event.isPrimary || !pages.current || drag.current
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = firstPhoto + (forward ? pageSize : -pageSize);
    if (target < 0 || target >= photoCount) return;
    // Finish any decorative button turn before starting a pointer-controlled turn.
    pages.current.querySelector(":scope > .journal-turn-layer")?.remove();
    const surface = startPageDrag(pages.current, forward, !singlePage, target, corner);
    if (!surface) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, startX: event.pageX, startY: event.pageY, target, surface, settling: false };
  }

  function moveCorner(event: PointerEvent<HTMLSpanElement>) {
    const active = drag.current;
    if (active?.pointerId !== event.pointerId || active.settling) return;
    active.surface.move(event.pageX - active.startX, event.pageY - active.startY);
  }

  function releaseCorner(event: PointerEvent<HTMLSpanElement>) {
    const active = drag.current;
    if (active?.pointerId !== event.pointerId || active.settling) return;
    if (event.type === "pointerup") moveCorner(event);
    const complete = event.type === "pointerup" && active.surface.shouldTurn();
    active.settling = true;
    active.surface.settle(complete, () => {
      if (drag.current !== active) return;
      if (complete) {
        // Keep the settled sheet visible until React commits the destination page.
        // The layout effect clears the drag layer before that commit is painted.
        setPhotoIndex(active.target);
      } else {
        cancelPageDrag();
      }
    });
  }

  function cornerHandle(forward: boolean, corner: PageCorner) {
    return (
      <span key={`${forward}-${corner}`} className="journal-grab-corner"
        data-edge={forward ? "right" : "left"} data-corner={corner} aria-hidden="true"
        onPointerDown={(event) => grabCorner(event, forward, corner)} onPointerMove={moveCorner}
        onPointerUp={releaseCorner} onPointerCancel={releaseCorner} onLostPointerCapture={releaseCorner} />
    );
  }

  function handleBookKey(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
      || !(event.target instanceof Element) || event.target.closest("input, textarea, dialog, [contenteditable]")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      turnPage(event.key === "ArrowLeft" ? -1 : 1);
    }
  }

  function beginSwipe(event: TouchEvent) {
    const touch = event.touches[0];
    suppressPhotoClick.current = false;
    const target = event.target instanceof Element ? event.target : null;
    swipeStart.current = event.touches.length === 1 && target
      && (!target.closest("button, input, dialog, label, .journal-grab-corner") || target.closest(".journal-enlarge-photo"))
      ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function finishSwipe(event: TouchEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || event.touches.length) return;
    const x = touch.clientX - start.x;
    const y = touch.clientY - start.y;
    if (Math.abs(x) >= 55 && Math.abs(x) > 1.5 * Math.abs(y)) {
      suppressPhotoClick.current = true;
      turnPage(x < 0 ? 1 : -1);
    }
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
      const next = await changeHike(id, (current) => ({ ...current, photos: [...current.photos, photo] }));
      remember(next);
      setPhotoIndex(next.photos.length - 1);
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
      onChange?.();
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
        <div className="journal-title-row">
          <h1 ref={heading} tabIndex={-1}>{title}</h1>
          {view.page === "list" && orderedHikes.length > 0 && !loading && !accountLoading && !loadError && (
            <button type="button" className="primary-action journal-new" onClick={() => open({ page: "form" })}>
              <Plus aria-hidden="true" /> Log a hike
            </button>
          )}
          {view.page === "hike" && hike && (
            <button type="button" className="secondary-action" disabled={busy}
              onClick={() => open({ page: "form", id: hike.id })}>Edit hike</button>
          )}
        </div>
      </div>
      <p className="screen-reader-only" role="status">{status}</p>
      {loading || accountLoading ? <p className="muted" role="status">Opening your journal…</p>
        : loadError ? <p className="error" role="alert">This browser could not open your journal storage.</p>
        : view.page === "form" ? (
          <>
            <HikeForm initial={hike ?? trail} busy={busy} save={submit} />
            {feedback}
          </>
        ) : view.page === "hike" && hike ? (
          <>
            {hike.notes && <p className="journal-notes">{hike.notes}</p>}
            <section className="journal-photo-book" data-spread={!singlePage && photoCount > 0}
              aria-labelledby="photo-book-title" onKeyDown={handleBookKey}>
              <div className="journal-book-tools">
                <h2 id="photo-book-title">Photo book</h2>
                <div className="journal-upload">
                  <PhotoPicker onPhoto={(file) => void addPhoto(file, hike.id)} disabled={busy} />
                </div>
              </div>
              {feedback}
              {photoCount > 0 && (
                <p className="muted journal-ai-hint">{!online ? "Connect to ask Gemini about a photo."
                  : !aiConfigured ? "AI nature notes are unavailable on this build."
                  : "Asking Gemini sends the selected photo for a possible plant or wildlife identification."}</p>
              )}
              <div ref={pages} className="journal-photos" id="journal-pages" onTouchStart={beginSwipe} onTouchEnd={finishSwipe}
                onTouchCancel={() => { swipeStart.current = null; }}
                onPointerDown={(event) => { if (event.pointerType !== "touch") suppressPhotoClick.current = false; }}
                onClickCapture={(event) => {
                  if (suppressPhotoClick.current && event.detail !== 0 && event.target instanceof Element
                    && event.target.closest(".journal-enlarge-photo")) {
                    event.stopPropagation();
                    suppressPhotoClick.current = false;
                  }
                }}>
                {!hike.photos.length && (
                  <div className="journal-blank-page">
                    <Images aria-hidden="true" />
                    <p className="muted">{busy ? "Saving photo…" : "Add your first photo from this hike."}</p>
                  </div>
                )}
                {hike.photos.map((photo, index) => (
                  <JournalPhotoCard key={photo.id} photo={photo} number={index + 1} online={online}
                    visible={index >= firstPhoto && index < endPhoto}
                    preparePreview={index >= firstPhoto - pageSize && index < endPhoto + pageSize}
                    save={async (patch) => remember(await changeHike(hike.id, (current) => ({
                      ...current,
                      photos: current.photos.map((item) => item.id === photo.id ? { ...item, ...patch } : item),
                    })))}
                    remove={async () => {
                      const next = await changeHike(hike.id, (current) => ({
                        ...current, photos: current.photos.filter(({ id }) => id !== photo.id),
                      }));
                      remember(next);
                      setPhotoIndex((selected) => Math.max(0, Math.min(
                        index < selected ? selected - 1 : selected, next.photos.length - 1)));
                    }} />
                ))}
                {firstPhoto > 0 && (["top", "bottom"] as const).map((corner) => cornerHandle(false, corner))}
                {endPhoto < photoCount && (["top", "bottom"] as const).map((corner) => cornerHandle(true, corner))}
              </div>
              {photoCount > 0 && (
                <nav className="journal-pagination" aria-label="Photo book pages">
                  <button type="button" className="secondary-action" aria-label="Previous page" aria-controls="journal-pages"
                    aria-disabled={firstPhoto === 0} onClick={() => turnPage(-1)}>
                    <ChevronLeft aria-hidden="true" /><span>Previous</span>
                  </button>
                  <span className="journal-page-number" aria-live="polite">
                    {endPhoto === firstPhoto + 1 ? `Page ${endPhoto}` : `Pages ${firstPhoto + 1}–${endPhoto}`} of {photoCount}
                  </span>
                  <button type="button" className="secondary-action" aria-label="Next page" aria-controls="journal-pages"
                    aria-disabled={endPhoto === photoCount} onClick={() => turnPage(1)}>
                    <span>Next</span><ChevronRight aria-hidden="true" />
                  </button>
                </nav>
              )}
              {singlePage && photoCount > 1 && (
                <div className="journal-filmstrip" role="group" aria-label="Jump to a photo">
                  {hike.photos.slice(stripStart, stripStart + stripSize).map((photo, offset) => {
                    const index = stripStart + offset;
                    return (
                      <button type="button" key={photo.id} aria-label={`Go to page ${index + 1}`}
                        aria-current={index === currentPhoto ? "page" : undefined} aria-controls="journal-pages"
                        onClick={() => goToPhoto(index)}>
                        <PhotoPreview photo={photo.crop?.image ?? photo.image} alt="" compact />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
            <button type="button" className="text-action journal-delete" disabled={busy}
              onClick={() => void removeHike(hike)}>Delete hike</button>
          </>
        ) : (
          <div className="journal-library">
            <section className="journal-entries" aria-label="Your hikes">
              {!orderedHikes.length ? (
                <div className="journal-empty">
                  <span className="journal-album-art" aria-hidden="true"><BookOpen /></span>
                  <div className="journal-empty-copy">
                    <h2>No hikes yet</h2>
                    <p className="muted">Start with a trail name and date. Add photos and notes whenever you like.</p>
                    <button type="button" className="primary-action" onClick={() => open({ page: "form" })}>
                      <Plus aria-hidden="true" /> Log your first hike
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2>Latest hike</h2>
                  <JournalHikeCard entry={orderedHikes[0]} featured onOpen={() => open({ page: "hike", id: orderedHikes[0].id })} />
                  {orderedHikes.length > 1 && (
                    <>
                      <h2>Earlier hikes</h2>
                      <ul className="journal-hikes">
                        {orderedHikes.slice(1).map((entry) => (
                          <li key={entry.id}>
                            <JournalHikeCard entry={entry} onOpen={() => open({ page: "hike", id: entry.id })} />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </section>
            {accountPanel}
          </div>
        )}
    </div>
  );
}

function JournalHikeCard({ entry, featured = false, onOpen }: {
  entry: Hike;
  featured?: boolean;
  onOpen: () => void;
}) {
  const covers = entry.photos.slice(0, featured ? 2 : 1);
  return (
    <button type="button" className={featured ? "journal-hike-card journal-hike-featured" : "journal-hike-card"} onClick={onOpen}>
      {covers.length > 0 ? (
        <span className="journal-hike-cover" data-pair={covers.length === 2}>
          {covers.map((photo) => <PhotoPreview key={photo.id} photo={photo.crop?.image ?? photo.image} alt="" />)}
        </span>
      ) : <span className="journal-album-art" aria-hidden="true"><BookOpen /></span>}
      <span className="journal-hike-summary">
        <time className="eyebrow" dateTime={entry.date}>{hikeDate(entry.date)}</time>
        <strong>{entry.trail}</strong>
        {entry.location && <span className="journal-hike-location muted"><MapPin aria-hidden="true" />{entry.location}</span>}
        {featured ? (
          <span className="journal-hike-open"><BookOpen aria-hidden="true" /> Open photo book <ChevronRight aria-hidden="true" /></span>
        ) : (
          <span className="journal-cover-count">{entry.photos.length} {entry.photos.length === 1 ? "photo" : "photos"}</span>
        )}
      </span>
    </button>
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
