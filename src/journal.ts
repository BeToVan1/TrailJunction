import { createStore, del, set, update, values } from "idb-keyval";
import type { PhotoCrop } from "./photo.ts";

export interface NatureNote {
  label: string;
  note: string;
}

export interface JournalPhoto {
  id: string;
  image: Blob;
  caption: string;
  nature?: NatureNote;
  crop?: { bounds: PhotoCrop; image: Blob };
}

export interface HikeDetails {
  trail: string;
  location: string;
  date: string;
  notes: string;
}

export interface Hike extends HikeDetails {
  id: string;
  photos: JournalPhoto[];
}

const journal = createStore("trail-junction-journal", "hikes");

export function getHikes() {
  return values<Hike>(journal);
}

export function saveHike(hike: Hike) {
  return set(hike.id, hike, journal);
}

export async function changeHike(id: string, change: (hike: Hike) => Hike) {
  let next: Hike | undefined;
  await update<Hike>(id, (previous) => {
    if (!previous) throw new Error("This hike was removed. Reopen the journal to refresh it.");
    next = change(previous);
    return next;
  }, journal);
  if (!next) throw new Error("The hike could not be updated.");
  return next;
}

export function deleteHike(id: string) {
  return del(id, journal);
}
