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

function getHikes() {
  return values<Hike>(journal);
}

function saveHike(hike: Hike) {
  return set(hike.id, hike, journal);
}

async function changeHike(id: string, change: (hike: Hike) => Hike) {
  let next: Hike | undefined;
  await update<Hike>(id, (previous) => {
    if (!previous) throw new Error("This hike was removed. Reopen the journal to refresh it.");
    next = change(previous);
    return next;
  }, journal);
  if (!next) throw new Error("The hike could not be updated.");
  return next;
}

function deleteHike(id: string) {
  return del(id, journal);
}

export const deviceJournal = { getHikes, saveHike, changeHike, deleteHike };
export type JournalStore = typeof deviceJournal;

export interface AccountHike {
  id: string;
  hike: Hike | null;
  version: string;
  pending: boolean;
  importOnly?: boolean;
}

export function createAccountJournal(projectId: string, uid: string) {
  const storage = createStore(`trail-junction-journal:${projectId}:${uid}`, "hikes");
  const records = () => values<AccountHike>(storage);

  async function edit(id: string, change: (current?: AccountHike) => Hike | null) {
    let hike: Hike | null | undefined;
    await update<AccountHike>(id, (current) => {
      hike = change(current);
      const previousTime = current ? Number(current.version.slice(0, 15)) : 0;
      const time = Math.max(Date.now(), previousTime + 1);
      const version = `${String(time).padStart(15, "0")}:${crypto.randomUUID()}`;
      return { id, hike, version, pending: true };
    }, storage);
    return hike;
  }

  const store: JournalStore = {
    async getHikes() {
      return (await records()).flatMap(({ hike }) => hike ? [hike] : []);
    },
    async saveHike(hike) {
      await edit(hike.id, () => hike);
    },
    async changeHike(id, change) {
      const hike = await edit(id, (current) => {
        if (!current?.hike) throw new Error("This hike was removed. Reopen the journal to refresh it.");
        return change(current.hike);
      });
      if (!hike) throw new Error("The hike could not be updated.");
      return hike;
    },
    async deleteHike(id) {
      await edit(id, () => null);
    },
  };

  return {
    ...store,
    records,
    async applyRemote(remote: AccountHike, expectedVersion?: string) {
      await update<AccountHike>(remote.id, (current) => {
        // Preserve an edit made while an earlier copy was in flight.
        if (current?.pending && current.version !== expectedVersion) return current;
        return !current || !remote.hike || remote.version >= current.version || current.version === expectedVersion
          ? remote : current;
      }, storage);
    },
    async copyFromDevice() {
      for (const hike of await deviceJournal.getHikes()) {
        await update<AccountHike>(hike.id, (existing) => existing ?? {
          id: hike.id,
          hike,
          version: `${String(Date.now()).padStart(15, "0")}:${crypto.randomUUID()}`,
          pending: true,
          importOnly: true,
        }, storage);
      }
    },
  };
}

export type AccountJournal = ReturnType<typeof createAccountJournal>;
