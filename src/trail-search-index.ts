type NameRow = [name: string, ...ids: number[]];
type Manifest = { version: string; created: number; grams: Record<string, [shard: string, count: number]> };

// Version the URL when the index format changes. The files are optional in local builds.
const indexRoot = "/trail-search/v1/";
let manifest: Promise<Manifest> | undefined;
const shards = new Map<string, Promise<Record<string, NameRow[]>>>();

async function readIndex<T>(path: string): Promise<T> {
  const response = await fetch(indexRoot + path, { signal: AbortSignal.timeout(1600) });
  if (!response.ok || !response.headers.get("content-type")?.includes("json")) throw new Error("Trail index unavailable");
  return response.json();
}

export function warmTrailSearchIndex() {
  if (typeof window === "undefined" || typeof DecompressionStream === "undefined") return;
  manifest ??= fetch(indexRoot + "manifest.bin", { signal: AbortSignal.timeout(1600) }).then(async (response) => {
    if (!response.ok || !response.body) throw new Error("Trail index unavailable");
    const data = response.body.pipeThrough(new DecompressionStream("gzip"));
    const index = await new Response(data).json() as Manifest;
    if (!index.created || Date.now() - index.created > 45 * 86_400_000) throw new Error("Trail index expired");
    return index;
  }).catch((error) => {
    manifest = undefined;
    throw error;
  });
  void manifest.catch(() => {});
  return manifest;
}

export async function indexedTrailIds(terms: string[], limit: number, signal: AbortSignal, parkCode?: string) {
  if (!terms.length && !parkCode) return;
  const grams = [...new Set(terms.flatMap(term =>
    [...term.matchAll(/(?=([A-Z0-9]{3}))/g)].map((match) => match[1])))];
  if (terms.length && !grams.length) return;

  try {
    const index = await warmTrailSearchIndex();
    if (!index) return;
    signal.throwIfAborted();
    const parkFile = parkCode ? `${index.version}/park-${parkCode}.json` : undefined;
    if (!terms.length && parkFile) {
      const ids = await readIndex<number[]>(parkFile);
      signal.throwIfAborted();
      return ids.slice(0, limit);
    }
    let rarest = grams[0];
    for (const gram of grams) {
      if (!index.grams[gram]) return [];
      if (index.grams[gram][1] < index.grams[rarest][1]) rarest = gram;
    }
    const path = `${index.version}/${index.grams[rarest][0]}.json`;
    let shard = shards.get(path);
    if (!shard) {
      shard = readIndex<Record<string, NameRow[]>>(path).catch((error) => {
        shards.delete(path);
        throw error;
      });
      const oldest = shards.keys().next();
      if (shards.size >= 12 && !oldest.done) shards.delete(oldest.value);
      shards.set(path, shard);
    }
    const [pack, parkIds] = await Promise.all([shard, parkFile ? readIndex<number[]>(parkFile) : undefined]);
    const rows = pack[rarest];
    signal.throwIfAborted();
    if (!Array.isArray(rows)) return;

    const inPark = parkIds ? new Set(parkIds) : undefined;
    const candidates = new Set<number>();
    for (const [name, ...ids] of rows) {
      let offset = 0;
      if (!terms.every((word) => {
        const match = name.indexOf(word, offset);
        offset = match + word.length;
        return match >= 0;
      })) continue;
      for (const id of ids) {
        if (inPark && !inPark.has(id)) continue;
        candidates.add(id);
      }
    }
    return [...candidates].sort((a, b) => a - b).slice(0, limit);
  } catch {
    signal.throwIfAborted();
    return;
  }
}
