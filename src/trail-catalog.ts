export const trails = [
  {
    id: "lower-yosemite-fall",
    name: "Lower Yosemite Fall Trail",
    park: "Yosemite National Park",
    details: "1 mi loop · Easy",
    elevationGain: "About 50 ft",
    format: "image",
    info: "https://www.nps.gov/yose/planyourvisit/lowerfalltrail.htm",
  },
  {
    id: "cooks-meadow",
    name: "Cook’s Meadow Loop",
    park: "Yosemite National Park",
    details: "1 mi loop · Easy",
    elevationGain: "Flat",
    format: "image",
    info: "https://www.nps.gov/yose/planyourvisit/cooksmeadowtrail.htm",
  },
  {
    id: "parus",
    name: "Pa’rus Trail",
    park: "Zion National Park",
    details: "Paved path",
    format: "linework",
    info: "https://www.nps.gov/thingstodo/hike-pa-rus-trail.htm",
  },
] as const;

export type Trail = (typeof trails)[number];
export type Coordinate = [longitude: number, latitude: number];
export type TrailMapData =
  | { id: Trail["id"]; format: "image"; image: Blob }
  | { id: Trail["id"]; format: "linework"; lines: Coordinate[][] };

export const zionDataSource = "https://services7.arcgis.com/2hYXmwteFLemN5bW/ArcGIS/rest/services/Zion_NPS_MAP_MC_WFL1/FeatureServer/23";

function normalize(text: string) {
  return text.normalize("NFKD").replace(/\p{Mark}/gu, "").replace(/['’]/g, "").toLowerCase().trim();
}

export function searchTrails(query: string) {
  const terms = normalize(query).split(/\s+/);
  return trails.filter(({ name, park }) => {
    const keywords = normalize(`${name} ${park}`);
    return terms.every((term) => keywords.includes(term));
  });
}

function isCoordinate(value: unknown): value is Coordinate {
  return Array.isArray(value) && value.length === 2 &&
    value.every((part) => typeof part === "number" && Number.isFinite(part)) &&
    Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}

function isLinework(value: unknown, id: Trail["id"]): value is { id: Trail["id"]; lines: Coordinate[][] } {
  return !!value && typeof value === "object" && "id" in value && value.id === id &&
    "lines" in value && Array.isArray(value.lines) && value.lines.length > 0 &&
    value.lines.every((line) => Array.isArray(line) && line.length >= 2 && line.every(isCoordinate));
}

export async function downloadTrailMap(trail: Trail): Promise<TrailMapData> {
  const extension = trail.format === "image" ? "jpg" : "json";
  const response = await fetch(`${import.meta.env.BASE_URL}trails/${trail.id}.${extension}`, {
    signal: AbortSignal.timeout(15000),
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
