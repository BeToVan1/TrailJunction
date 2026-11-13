import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { gzipSync } from "node:zlib";

const api = "https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/37/query";
const where = "trailtype = 'Terra Trail' AND (hikerpedestrian IS NULL OR UPPER(hikerpedestrian) NOT IN ('N', 'NO')) AND (name IS NOT NULL OR namealternate IS NOT NULL OR maplabel IS NOT NULL)";
const output = resolve(process.argv[2] ?? "public/trail-search", "v1");
const pageSize = 1800;

async function query(params) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(api + "?" + new URLSearchParams({ f: "json", ...params }), {
        signal: AbortSignal.timeout(22000),
      });
      if (!response.ok) throw new Error("USGS HTTP " + response.status);
      const json = await response.json();
      if (json.error) throw new Error(JSON.stringify(json.error));
      return json;
    } catch (error) {
      if (attempt >= 3) throw error;
      await delay(500 * (attempt + 1));
    }
  }
}

const data = await query({ where, returnIdsOnly: "true" });
const allIds = data.objectIds?.toSorted((a, b) => a - b);
if (!allIds?.length || data.exceededTransferLimit) throw new Error("USGS did not return the national trail IDs.");

const records = new Map();
let next = 0;
let completed = 0;
async function loadPage(ids) {
  const fields = "objectid,name,namealternate,maplabel";
  let min = ids[0];
  const last = ids.at(-1);
  const remaining = new Set(ids);
  while (min <= last && remaining.size) {
    const page = await query({
      where: "objectid >= " + min + " AND objectid <= " + last,
      outFields: fields, returnGeometry: "false", orderByFields: "objectid",
      resultRecordCount: "2000", cacheHint: "true",
    });
    if (!page.features?.length) break;
    for (const { attributes } of page.features) {
      if (!remaining.delete(attributes.objectid)) continue;
      for (const field of ["name", "namealternate", "maplabel"]) {
        const name = attributes[field]?.toUpperCase().trim();
        if (!name) continue;
        let matches = records.get(name);
        if (!matches) {
          matches = new Set();
          records.set(name, matches);
        }
        matches.add(attributes.objectid);
      }
    }
    min = page.features.at(-1).attributes.objectid + 1;
  }
  if (remaining.size) throw new Error("USGS changed or returned an incomplete page near " + ids[0]);
  if (++completed % 50 === 0) console.log("Loaded", completed, "of", Math.ceil(allIds.length / pageSize), "pages");
}
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < allIds.length) {
    const start = next;
    next += pageSize;
    await loadPage(allIds.slice(start, start + pageSize));
  }
}));

const grams = new Map();
for (const name of [...records.keys()].sort()) {
  const row = [name, ...[...records.get(name)].sort((a, b) => a - b)];
  for (const gram of new Set([...name.matchAll(/(?=([A-Z0-9]{3}))/g)].map(match => match[1]))) {
    if (!grams.has(gram)) grams.set(gram, []);
    grams.get(gram).push(row);
  }
}

const manifest = { created: Date.now(), grams: {} };
const files = [];
let pack = {};
let size = 0;
function addFile(shards) {
  const id = String(files.length);
  files.push(JSON.stringify(shards));
  for (const [gram, rows] of Object.entries(shards)) manifest.grams[gram] = [id, rows.length];
}

for (const gram of [...grams.keys()].sort()) {
  const rows = grams.get(gram);
  const bytes = JSON.stringify(rows).length;
  if (bytes > 90_000) {
    addFile({ [gram]: rows });
  } else {
    if (size + bytes > 90_000) {
      addFile(pack);
      pack = {};
      size = 0;
    }
    pack[gram] = rows;
    size += bytes;
  }
}
if (size) addFile(pack);
const parkBounds = JSON.parse(await readFile(new URL("../src/nps-park-boundaries.json", import.meta.url), "utf8"));
const parkFiles = new Map();
next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < parkBounds.length) {
    const [code, , bounds] = parkBounds[next++];
    const ids = await query({
      where, returnIdsOnly: "true", geometry: bounds.join(","), geometryType: "esriGeometryEnvelope",
      inSR: "4326", spatialRel: "esriSpatialRelIntersects",
    });
    if (!ids.exceededTransferLimit && Array.isArray(ids.objectIds)) {
      parkFiles.set("park-" + code + ".json", JSON.stringify(ids.objectIds.sort((a, b) => a - b)));
    }
  }
}));
const hash = createHash("sha256");
for (const file of files) hash.update(file);
for (const [name, contents] of [...parkFiles].sort()) hash.update(name).update(contents);
manifest.version = hash.digest("hex").slice(0, 16);
const directory = resolve(output, manifest.version);
await mkdir(directory, { recursive: true });
await Promise.all(files.map((contents, i) => writeFile(resolve(directory, i + ".json"), contents)));
await Promise.all([...parkFiles].map(([name, contents]) => writeFile(resolve(directory, name), contents)));
// Pack the lookup table so it stays small on the first visit.
const manifestBytes = gzipSync(JSON.stringify(manifest));
await writeFile(resolve(output, "manifest.bin"), manifestBytes);
console.log("Indexed", allIds.length, "segments and", records.size, "names in", files.length, "files.");
console.log("Indexed", parkFiles.size, "national park bounds.");
