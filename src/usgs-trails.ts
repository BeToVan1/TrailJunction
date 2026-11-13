import { squareTrailExtent } from "./map-projection.ts";
import { matchParkQuery, parkForLines, type Park } from "./nps-parks.ts";
import {
  isCoordinate, normalizeTrailName, type Coordinate, type UsgsMapData, type UsgsTrail,
} from "./trail-catalog.ts";
import { stateForPoint } from "./us-state.ts";
import { indexedTrailIds } from "./trail-search-index.ts";

export const usgsTrailsLayer = "https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/37";
export const usgsTopoService = "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer";
export const nationalMap = "https://www.usgs.gov/programs/national-geospatial-program/national-map";
const searchLimit = 120;

interface Segment {
  id: number;
  permanentId: string;
  name: string;
  agency: string;
  surface: string;
  trailNumber: string;
  hiking: boolean;
  biking: boolean;
  miles: number | undefined;
  lines: Coordinate[][];
}

interface FeatureResponse {
  features?: { attributes?: Record<string, unknown>; geometry?: { paths?: unknown } }[];
  exceededTransferLimit?: boolean;
  error?: unknown;
}

function trailName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseLines(paths: unknown) {
  if (!Array.isArray(paths)) return [];
  return paths.filter((line): line is Coordinate[] =>
    Array.isArray(line) && line.length >= 2 && line.every(isCoordinate));
}

function parseSegments(response: FeatureResponse): Segment[] {
  return (response.features ?? []).flatMap(({ attributes, geometry }) => {
    if (!attributes) return [];
    const id = attributes.objectid;
    const name = trailName(attributes.name) || trailName(attributes.maplabel) || trailName(attributes.namealternate);
    const lines = parseLines(geometry?.paths);
    if (typeof id !== "number" || !Number.isSafeInteger(id) || !name || !lines.length) return [];
    const miles = attributes.lengthmiles;
    return [{
      id,
      permanentId: trailName(attributes.permanentidentifier).replace(/[{}]/g, "").toLowerCase() || String(id),
      name,
      agency: trailName(attributes.sourceoriginator),
      surface: trailName(attributes.trailsurface),
      trailNumber: trailName(attributes.trailnumber),
      hiking: attributes.hikerpedestrian === "Y",
      biking: attributes.bicycle === "Y",
      miles: typeof miles === "number" && Number.isFinite(miles) && miles > 0 ? miles : undefined,
      lines,
    }];
  });
}

function distanceMeters(a: Coordinate, b: Coordinate) {
  const radians = Math.PI / 180;
  const latitude = (a[1] + b[1]) / 2 * radians;
  return Math.hypot((a[0] - b[0]) * Math.cos(latitude), a[1] - b[1]) * radians * 6371008.8;
}

function ends(segment: Segment) {
  return segment.lines.flatMap((line) => [line[0], line[line.length - 1]]);
}

function connected(a: Segment, b: Segment) {
  return ends(a).some((point) => ends(b).some((other) => distanceMeters(point, other) <= 30));
}

function groupSegments(segments: Segment[]) {
  const groupsByName = new Map<string, Segment[][]>();
  for (const segment of segments) {
    const name = normalizeTrailName(segment.name);
    const groups = groupsByName.get(name) ?? [];
    const merged = [segment];
    // Merge all groups touched by this segment, including a segment bridging two earlier groups.
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i].some((other) => connected(segment, other))) {
        merged.push(...groups[i]);
        groups.splice(i, 1);
      }
    }
    groups.push(merged);
    groupsByName.set(name, groups);
  }
  return [...groupsByName.values()].flat();
}

function coordinateLabel([longitude, latitude]: Coordinate) {
  return `${Math.abs(latitude).toFixed(2)}°${latitude < 0 ? "S" : "N"}, ${Math.abs(longitude).toFixed(2)}°${longitude < 0 ? "W" : "E"}`;
}

function describeGroup(segments: Segment[], searchPark?: Park) {
  segments.sort((a, b) => a.permanentId.localeCompare(b.permanentId) || a.id - b.id);
  const first = segments[0];
  const point = first.lines[0][0];
  const lines = segments.flatMap((segment) => segment.lines);
  const park = parkForLines(lines, searchPark);
  if (searchPark && !park) return;
  const states = new Set<string>();
  if (!park) {
    for (const segment of segments) {
      for (const end of ends(segment)) {
        const state = stateForPoint(end);
        if (state) states.add(state);
      }
    }
  }
  const location = park?.name || [...states].sort().join(" / ") || coordinateLabel(point);
  const distance = segments.every((segment) => segment.miles !== undefined)
    ? segments.reduce((sum, segment) => sum + (segment.miles ?? 0), 0)
    : undefined;
  const detail = distance === undefined ? "Mapped trail" : `${Number(distance.toFixed(2)) || "<0.01"} mi mapped`;
  const source = segments.find((segment) => segment.agency)?.agency;
  const trail: UsgsTrail = {
    id: `usgs-${first.permanentId}`,
    format: "usgs-topo",
    name: first.name,
    park: location,
    details: source ? `${detail} · ${source}` : detail,
    lines,
    ...(park && { parkCode: park.code }),
    info: "https://www.usgs.gov/national-digital-trails/usgs-trails-explorer",
    facts: {
      distanceMiles: distance,
      agencies: reportedValues(segments.map(({ agency }) => agency)),
      surfaces: reportedValues(segments.map(({ surface }) => surface)),
      trailNumbers: reportedValues(segments.map(({ trailNumber }) => trailNumber)),
      uses: [
        ...(segments.every(({ hiking }) => hiking) ? ["Walking and hiking"] : []),
        ...(segments.every(({ biking }) => biking) ? ["Biking"] : []),
      ],
    },
  };
  return { trail, point };
}

function reportedValues(values: string[]) {
  return [...new Set(values.filter((value) => value && !/^(unknown|unspecified|n\/?a|none)$/i.test(value)))].sort();
}

export function usgsSearchTerms(query: string) {
  return (query.slice(0, 80).toUpperCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 8);
}

type SearchResult = { trails: UsgsTrail[]; limited: boolean };
const searchCache = new Map<string, { result: SearchResult; expires: number }>();
const cacheLifetime = 10 * 60 * 1000;
const cacheSize = 24;

function searchKey(query: string) {
  const place = matchParkQuery(query);
  return `${place?.park.code ?? ""}:${usgsSearchTerms(place?.trailName ?? query).join(" ")}`;
}

export function cachedUsgsTrails(query: string) {
  const key = searchKey(query);
  const entry = searchCache.get(key);
  if (!entry) return;
  searchCache.delete(key);
  if (entry.expires <= Date.now()) return;
  searchCache.set(key, entry);
  return entry.result;
}

async function queryFeatures(params: Record<string, string>, signal: AbortSignal): Promise<FeatureResponse> {
  const query = new URLSearchParams({
    f: "json",
    returnGeometry: "true",
    returnM: "false",
    returnZ: "false",
    outSR: "4326",
    ...params,
  });
  const response = await fetch(`${usgsTrailsLayer}/query?${query}`, { signal });
  if (!response.ok) throw new Error("USGS trail data is unavailable.");
  const data = await response.json() as FeatureResponse;
  if (data.error || !Array.isArray(data.features)) throw new Error("USGS did not return trail data.");
  return data;
}

export async function searchUsgsTrails(query: string, signal: AbortSignal): Promise<SearchResult> {
  signal.throwIfAborted();
  const cached = cachedUsgsTrails(query);
  if (cached) return cached;
  const place = matchParkQuery(query);
  const terms = usgsSearchTerms(place?.trailName ?? query);
  if (!place && terms.join("").length < 3) return { trails: [], limited: false };
  const pattern = `'%${terms.join("%")}%'`;
  const nameMatches = ["name", "namealternate", "maplabel"].map((field) =>
    terms.length ? `UPPER(${field}) LIKE ${pattern}` : `${field} IS NOT NULL`).join(" OR ");
  const spatial: Record<string, string> = place ? {
    geometry: place.park.bounds.join(","),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
  } : {};
  const geometryFields = {
    outFields: "objectid,name,namealternate,maplabel,sourceoriginator,permanentidentifier,lengthmiles,trailsurface,trailnumber,hikerpedestrian,bicycle",
    resultRecordCount: String(searchLimit),
    geometryPrecision: "5",
    maxAllowableOffset: "0.00002",
    cacheHint: "true",
  };
  const ids = await indexedTrailIds(terms, searchLimit, signal, place?.park.code);
  let data: FeatureResponse | undefined;
  if (ids) {
    if (!ids.length) {
      data = { features: [] };
    } else {
      try {
        const result = await queryFeatures({ ...geometryFields, objectIds: ids.join(",") },
          AbortSignal.any([signal, AbortSignal.timeout(2400)]));
        // Verify the live IDs still refer to matching trails after a source refresh.
        const namePattern = new RegExp(terms.join(".*"), "isu");
        if (result.features?.length === ids.length && result.features.every(({ attributes }) =>
          !terms.length || ["name", "namealternate", "maplabel"].some((field) =>
            namePattern.test(trailName(attributes?.[field]))))) data = result;
      } catch {
        signal.throwIfAborted();
      }
    }
  }
  if (!data) {
    data = await queryFeatures({
      ...geometryFields,
      ...spatial,
      where: `trailtype = 'Terra Trail' AND (hikerpedestrian IS NULL OR UPPER(hikerpedestrian) NOT IN ('N', 'NO')) AND (${nameMatches})`,
    }, AbortSignal.any([signal, AbortSignal.timeout(12000)]));
  }
  signal.throwIfAborted();
  const matches = groupSegments(parseSegments(data)).flatMap((segments) => {
    const match = describeGroup(segments, place?.park);
    return match ? [match] : [];
  });
  const nameAndPlace = (trail: UsgsTrail) => normalizeTrailName(`${trail.name} ${trail.park}`);
  const counts = new Map<string, number>();
  for (const { trail } of matches) {
    const key = nameAndPlace(trail);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const searchName = normalizeTrailName(place?.trailName ?? query);
  const rank = (trail: UsgsTrail) => {
    const name = normalizeTrailName(trail.name);
    return name === searchName ? 0 : name.startsWith(searchName) ? 1 : 2;
  };
  const trails = matches.map(({ trail, point }) => counts.get(nameAndPlace(trail)) === 1
    ? trail : { ...trail, park: `${trail.park} · ${coordinateLabel(point)}` });
  trails.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name) || a.park.localeCompare(b.park));
  const result = { trails, limited: Boolean(data.exceededTransferLimit || data.features!.length >= searchLimit) };
  if (searchCache.size >= cacheSize) {
    const oldest = searchCache.keys().next();
    if (!oldest.done) searchCache.delete(oldest.value);
  }
  searchCache.set(searchKey(query), { result, expires: Date.now() + cacheLifetime });
  return result;
}

export function usgsTopoImage(extent: UsgsMapData["extent"], size: number) {
  const params = new URLSearchParams({
    bbox: [extent.west, extent.south, extent.east, extent.north].join(","),
    bboxSR: "3857",
    imageSR: "3857",
    size: `${size},${size}`,
    format: "jpg",
    f: "image",
  });
  return `${usgsTopoService}/export?${params}`;
}

export async function downloadUsgsTrail(trail: UsgsTrail): Promise<UsgsMapData> {
  const extent = squareTrailExtent(trail.lines);
  const size = 1200;
  const response = await fetch(usgsTopoImage(extent, size), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("The USGS topographic map could not be downloaded.");
  const image = await response.blob();
  if (image.type !== "image/jpeg" || !image.size) throw new Error("The USGS topographic map could not be opened.");
  return { id: trail.id, format: "usgs-topo", trail, image, extent, size };
}
