import { Bytes, collection, doc, getDoc, getDocs, runTransaction } from "firebase/firestore/lite";
import { getJournalFirestore } from "./journal-firebase.ts";
import type { AccountHike, AccountJournal, Hike, JournalPhoto } from "./journal.ts";

type ImageParts = string[];
type CloudPhoto = Omit<JournalPhoto, "image" | "crop"> & {
  image: ImageParts;
  crop?: { bounds: NonNullable<JournalPhoto["crop"]>["bounds"]; image: ImageParts };
};
type CloudHike = { version: string; hike: (Omit<Hike, "id" | "photos"> & { photos: CloudPhoto[] }) | null };
const chunkSize = 640 * 1024;

function mediaIds(hike?: CloudHike["hike"]) {
  return new Set(hike?.photos.flatMap(({ image, crop }) => [...image, ...(crop?.image ?? [])]));
}

async function encode(record: AccountHike, media: Map<string, Bytes>): Promise<CloudHike> {
  async function parts(blob: Blob) {
    const ids: string[] = [];
    for (let start = 0; start < blob.size; start += chunkSize) {
      const data = new Uint8Array(await blob.slice(start, start + chunkSize).arrayBuffer());
      const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
      const id = Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
      media.set(id, Bytes.fromUint8Array(data));
      ids.push(id);
    }
    return ids;
  }

  if (!record.hike) return { version: record.version, hike: null };
  const { id: _id, photos, ...details } = record.hike;
  const encoded = await Promise.all(photos.map(async ({ image, crop, nature, ...photo }) => ({
    ...photo,
    image: await parts(image),
    ...(nature && { nature }),
    ...(crop && { crop: { bounds: crop.bounds, image: await parts(crop.image) } }),
  })));
  return { version: record.version, hike: { ...details, photos: encoded } };
}

export async function syncJournal(uid: string, journal: AccountJournal, signal: AbortSignal) {
  const hikes = collection(getJournalFirestore(), "journals", uid, "hikes");
  const remote = new Map((await getDocs(hikes)).docs.map((entry) => [entry.id, entry.data() as CloudHike]));

  async function download(id: string, record: CloudHike): Promise<AccountHike> {
    if (!record.hike) return { id, version: record.version, hike: null, pending: false };
    const { photos, ...details } = record.hike;
    const media = new Map<string, Promise<ArrayBuffer>>();
    async function image(parts: ImageParts) {
      const buffers = await Promise.all(parts.map((part) => {
        let data = media.get(part);
        if (!data) {
          data = getDoc(doc(hikes, id, "media", part)).then((snapshot) => {
            const bytes = snapshot.get("data") as Bytes | undefined;
            if (!bytes) throw new Error("A photo changed during sync. Try again.");
            return new Uint8Array(bytes.toUint8Array()).buffer;
          });
          media.set(part, data);
        }
        return data;
      }));
      return new Blob(buffers, { type: "image/jpeg" });
    }

    const decoded: JournalPhoto[] = await Promise.all(photos.map(async ({ image: original, crop, ...photo }) => ({
      ...photo,
      image: await image(original),
      ...(crop && { crop: { bounds: crop.bounds, image: await image(crop.image) } }),
    })));
    return { id, version: record.version, hike: { ...details, id, photos: decoded }, pending: false };
  }

  for (const local of await journal.records()) {
    signal.throwIfAborted();
    const server = remote.get(local.id);
    remote.delete(local.id);
    if (!local.pending) {
      if (server && server.version !== local.version) {
        await journal.applyRemote(await download(local.id, server));
      }
      continue;
    }

    const media = new Map<string, Bytes>();
    const next = await encode(local, media);
    signal.throwIfAborted();
    const accepted = await runTransaction(hikes.firestore, async (transaction) => {
      signal.throwIfAborted();
      const ref = doc(hikes, local.id);
      const current = (await transaction.get(ref)).data() as CloudHike | undefined;
      // A deleted hike cannot be resurrected by a device reconnecting with stale edits.
      if (current && (local.importOnly || !current.hike || current.version >= next.version)) return current;
      const previousMedia = mediaIds(current?.hike);
      for (const [part, data] of media) {
        if (!previousMedia.has(part)) transaction.set(doc(ref, "media", part), { data });
      }
      for (const part of previousMedia) {
        if (!media.has(part)) transaction.delete(doc(ref, "media", part));
      }
      transaction.set(ref, next);
      return next;
    });
    signal.throwIfAborted();
    const synced = accepted.version === local.version
      ? { ...local, pending: false }
      : await download(local.id, accepted);
    await journal.applyRemote(synced, local.version);
  }

  for (const [id, record] of remote) {
    signal.throwIfAborted();
    await journal.applyRemote(await download(id, record));
  }
}
