import geometry from "./rampart-geometry.json" with { type: "json" };
import type { Coordinate } from "./trail-catalog.ts";
import { signLabelKey, type SignEntry } from "./sign-reading.ts";

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
    direction: "left",
  },
  {
    id: "longmire",
    name: "Longmire",
    via: "Wonderland Trail · 2.0 mi on the sign",
    lines: [east],
    direction: "right",
  },
] as const;

export type RampartTrip = (typeof rampartTrips)[number];

const westSignRows = [
  { key: "devils dream camp", miles: "3.9", names: ["devils dream camp", "devils dream cmp", "devils dream"] },
  { key: "pyramid creek camp", miles: "1.7", names: ["pyramid creek camp", "pyramid crk camp", "pyramid creek", "pyramid crk"] },
  { key: "indian henrys", miles: "5", names: ["indian henrys"] },
];

export function rampartSignLabelKey(label: string) {
  const key = signLabelKey(label);
  const normalized = key.replace(/[’'‘]/g, "").replace(/\.(?!\d)/g, "");
  // These three destinations each appear once on the sample sign. A model
  // may expand an abbreviation or omit mileage when repeating the arrow label.
  // Preserve mileage on all other rows, including the two Longmire entries.
  const row = westSignRows.find(({ miles, names }) =>
    names.some((name) => normalized === name || normalized === `${name} ${miles}`));
  return row?.key ?? key;
}

export function matchRampartSign(entries: readonly SignEntry[], trip: RampartTrip) {
  const matching = entries.filter(({ label, direction }) => {
    if (!direction) return false;
    // The same place is listed twice on the two panels. Require the mileage
    // from the Wonderland panel when using Longmire as evidence.
    if (trip.id === "longmire") return signLabelKey(label) === "longmire 2";
    return westSignRows.some(({ key }) => key === rampartSignLabelKey(label));
  });
  if (matching.length && matching.every(({ direction }) => direction === trip.direction)) {
    return matching.find(({ label }) => rampartSignLabelKey(label) === "devils dream camp") ?? matching[0];
  }
}
