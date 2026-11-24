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
    signKey: "longmire 2",
    name: "Longmire",
    via: "Wonderland Trail · 2.0 mi on the sign",
    lines: [east],
    direction: "right",
  },
  {
    id: "longmire-ridge",
    name: "Longmire",
    signKey: "longmire 3",
    via: "Rampart Ridge Trail · 3.0 mi on the sign",
    lines: [ridge],
    direction: "left",
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

// Verified transcription for the two panels in the fixed NPS demo image.
const sampleLongmireRows: readonly SignEntry[] = [
  { label: "LONGMIRE 2.0", direction: "right" },
  { label: "LONGMIRE 3.0", direction: "left" },
];

export function verifyRampartSampleRows(entries: readonly SignEntry[]) {
  const verified = [...entries];
  for (const row of sampleLongmireRows) {
    const index = verified.findIndex(entry => signLabelKey(entry.label) === signLabelKey(row.label));
    if (index < 0) verified.push(row);
    else verified[index] = { ...verified[index], direction: row.direction };
  }
  return verified;
}

export function matchRampartSign(entries: readonly SignEntry[], trip: RampartTrip) {
  const matching = entries.filter(({ label, direction }) => {
    if (!direction) return false;
    if ("signKey" in trip) return signLabelKey(label) === trip.signKey;
    return westSignRows.some(({ key }) => key === rampartSignLabelKey(label));
  });
  if (matching.length && matching.every(({ direction }) => direction === trip.direction)) {
    return matching.find(({ label }) => rampartSignLabelKey(label) === "devils dream camp") ?? matching[0];
  }
}
