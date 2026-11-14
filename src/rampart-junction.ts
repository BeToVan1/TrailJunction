import geometry from "./rampart-geometry.json";
import type { Coordinate } from "./trail-catalog.ts";
import type { SignEntry } from "./sign-reading.ts";

export const rampartUrl = "/junction/rampart-ridge";
export const rampartName = "Rampart Ridge Junction";
export const rampartPhoto = "/signs/rampart-junction.jpg";
export const rampartBasemap = "/trails/rampart-junction.jpg";
export const rampartPhotoSource = "https://npgallery.nps.gov/AssetDetail/cb80ba2c-e675-4fde-aef5-2c8989aab960";
export const rampartGuide = "https://www.nps.gov/mora/planyourvisit/rampart-ridge-trail.htm";
export const rampartConditions = "https://www.nps.gov/mora/planyourvisit/trails-and-backcountry-camp-conditions.htm";

const coordinates = (line: number[][]): Coordinate[] => line.map(([lon, lat]) => [lon, lat]);
const west = coordinates(geometry.west);
const east = coordinates(geometry.east);
const ridge = coordinates(geometry.ridge);
export const rampartMap = {
  extent: geometry.extent,
  junction: geometry.junction as Coordinate,
  pyramid: geometry.pyramid as Coordinate,
  lines: [west, east, ridge],
  size: 1000,
  url: rampartBasemap,
};

export const rampartTrips = [
  {
    id: "devils-dream",
    name: "Devil’s Dream Camp",
    via: "Wonderland Trail via Pyramid Creek",
    lines: [west],
    aliases: ["pyramid creek camp", "pyramid crk camp", "devils dream camp", "devils dream cmp", "devils dream", "indian henrys"],
    direction: "left",
  },
  {
    id: "longmire",
    name: "Longmire",
    via: "Wonderland Trail · 2.0 mi on the sign",
    lines: [east],
    aliases: ["longmire"],
    direction: "right",
  },
] as const;

export type RampartTrip = (typeof rampartTrips)[number];

function cleanLabel(text: string) {
  return text.toLowerCase().replace(/[’'.]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchRampartSign(entries: readonly SignEntry[], trip: RampartTrip) {
  const matching = entries.filter(({ label, direction }) => {
    if (!direction) return false;
    // The same place is listed twice on the two panels. Require the mileage
    // from the Wonderland panel when using Longmire as evidence.
    if (trip.id === "longmire") return /^longmire\s+2(?:\.0)?(?:\s*(?:mi|miles?))?\.?$/i.test(label.trim());
    const name = cleanLabel(label).replace(/\s+\d.*$/, "");
    return trip.aliases.some((alias) => alias === name);
  });
  if (matching.length && matching.every(({ direction }) => direction === trip.direction)) return matching[0];
}
