export const trails = [
  {
    id: "lower-yosemite-fall",
    name: "Lower Yosemite Fall Trail",
    park: "Yosemite National Park",
    details: "1 mi loop · Easy",
    distance: "1 mi",
    elevationGain: "About 50 ft",
    routeType: "Loop",
    difficulty: "Easy",
    duration: "30 min",
    description: "A paved loop in Yosemite Valley leads to the footbridge below Lower Yosemite Fall, with views of both drops. The eastern side of the loop is wheelchair accessible in snow-free conditions.",
    access: "Start at the Lower Yosemite Fall Trailhead, near shuttle stop 6.",
    format: "image",
    info: "https://www.nps.gov/yose/planyourvisit/lowerfalltrail.htm",
  },
  {
    id: "cooks-meadow",
    name: "Cook’s Meadow Loop",
    park: "Yosemite National Park",
    details: "1 mi loop · Easy",
    distance: "1 mi",
    elevationGain: "Flat",
    routeType: "Loop",
    difficulty: "Easy",
    duration: "30 min",
    description: "Cross the meadow on a boardwalk with views of Yosemite Falls, Half Dome and Sentinel Rock. A short detour onto Sentinel Bridge opens up another view of Half Dome.",
    access: "Start at the Yosemite Valley Visitor Center or the Lower Yosemite Fall shuttle stop.",
    format: "image",
    info: "https://www.nps.gov/yose/planyourvisit/cooksmeadowtrail.htm",
  },
  {
    id: "parus",
    name: "Pa’rus Trail",
    park: "Zion National Park",
    details: "Paved path",
    distance: "3.5 mi round trip",
    elevationGain: "About 50 ft",
    routeType: "Out and back",
    difficulty: "Easy",
    duration: "2 hr",
    description: "This paved path follows the Virgin River from the Zion Canyon Visitor Center to Canyon Junction. Look for views of the Watchman and interpretive exhibits along the river.",
    access: "Start at the Zion Canyon Visitor Center. The main path is wheelchair accessible and allows bicycles and leashed dogs.",
    format: "linework",
    info: "https://www.nps.gov/thingstodo/hike-pa-rus-trail.htm",
  },
] as const;

export type FeaturedTrail = (typeof trails)[number];
export interface UsgsTrailFacts {
  distanceMiles?: number;
  agencies?: string[];
  surfaces?: string[];
  trailNumbers?: string[];
  uses?: string[];
}
export interface UsgsTrail {
  id: string;
  format: "usgs-topo";
  name: string;
  park: string;
  parkCode?: string;
  details: string;
  lines: Coordinate[][];
  info: string;
  facts?: UsgsTrailFacts;
}
export type Trail = FeaturedTrail | UsgsTrail;
export type Coordinate = [longitude: number, latitude: number];
export interface MapExtent {
  west: number;
  south: number;
  east: number;
  north: number;
}
export type TrailMapData =
  | { id: FeaturedTrail["id"]; format: "image"; image: Blob }
  | { id: FeaturedTrail["id"]; format: "linework"; lines: Coordinate[][] }
  | UsgsMapData;

export interface UsgsMapData {
  id: string;
  format: "usgs-topo";
  trail: UsgsTrail;
  image: Blob;
  extent: MapExtent;
  size: number;
}

export const zionDataSource = "https://services7.arcgis.com/2hYXmwteFLemN5bW/ArcGIS/rest/services/Zion_NPS_MAP_MC_WFL1/FeatureServer/23";

export function normalizeTrailName(text: string) {
  return text.normalize("NFKD").replace(/\p{Mark}/gu, "").replace(/['’]/g, "").toLowerCase().trim();
}

export function searchTrails(query: string) {
  const terms = normalizeTrailName(query).split(/\s+/);
  return trails.filter(({ name, park }) => {
    const keywords = normalizeTrailName(`${name} ${park}`);
    return terms.every((term) => keywords.includes(term));
  });
}

export function isCoordinate(value: unknown): value is Coordinate {
  return Array.isArray(value) && value.length === 2 &&
    value.every((part) => typeof part === "number" && Number.isFinite(part)) &&
    Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}

function isLinework(value: unknown, id: FeaturedTrail["id"]): value is { id: FeaturedTrail["id"]; lines: Coordinate[][] } {
  return !!value && typeof value === "object" && "id" in value && value.id === id &&
    "lines" in value && Array.isArray(value.lines) && value.lines.length > 0 &&
    value.lines.every((line) => Array.isArray(line) && line.length >= 2 && line.every(isCoordinate));
}

export async function downloadTrailMap(trail: FeaturedTrail, signal?: AbortSignal): Promise<TrailMapData> {
  const extension = trail.format === "image" ? "jpg" : "json";
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(`${import.meta.env.BASE_URL}trails/${trail.id}.${extension}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error("The trail map could not be downloaded.");
  if (trail.format === "image") {
    const image = await response.blob();
    if (image.type !== "image/jpeg" || !image.size) throw new Error("The trail map image could not be opened.");
    return { id: trail.id, format: "image", image };
  }
  const map: unknown = await response.json();
  if (!isLinework(map, trail.id)) throw new Error("The trail map could not be opened.");
  return { ...map, format: "linework" };
}
