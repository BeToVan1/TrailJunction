import type { SignEntry } from "./sign-reading.ts";
import { normalizeTrailName, type Coordinate, type Trail } from "./trail-catalog.ts";

export const parusMapPlaces = [
  {
    id: "parus-trailhead",
    name: "Pa’rus Trailhead",
    location: [-112.986755, 37.201825] as Coordinate,
    aliases: ["Pa’rus Trailhead", "Pa’rus Trail Head"],
  },
  {
    id: "canyon-junction",
    name: "Canyon Junction",
    location: [-112.973749, 37.218756] as Coordinate,
    aliases: ["Canyon Junction"],
  },
] as const;

export type SavedSignMapMatch = {
  name: string;
  label: string;
} & ({ kind: "trail" } | { kind: "place"; id: (typeof parusMapPlaces)[number]["id"] });

function nameKey(label: string) {
  return normalizeTrailName(label.normalize("NFKC"))
    .replace(/^[\s←→↑↓]+|[\s←→↑↓]+$/gu, "")
    .replace(/\s+/g, " ");
}

function signDestinationNames(label: string) {
  const full = nameKey(label).replace(/^to /, "");
  // A decimal or explicit unit distinguishes mileage from names like “Route 309.”
  const withoutDistance = full.replace(/[\s:–—-]+\(?\s*(?:\d+[.,]\d+\s*(?:mi\.?|miles?)?|\d+\s*(?:mi\.?|miles?))\s*\)?\.?$/u, "");
  return [full, withoutDistance];
}

export function matchSavedSignToMap(entries: readonly SignEntry[], trail: Trail): SavedSignMapMatch[] {
  const candidates = entries.map(({ label }) => ({ label, names: signDestinationNames(label) }));
  const findLabel = (names: readonly string[]) => {
    const keys = names.map(nameKey);
    return candidates.find(({ names: observed }) => observed.some((key) => keys.includes(key)))?.label;
  };
  const matches: SavedSignMapMatch[] = [];
  const trailLabel = findLabel(trail.id === "parus" ? [trail.name, "Pa’rus"] : [trail.name]);
  if (trailLabel) matches.push({ kind: "trail", label: trailLabel, name: trail.name });

  if (trail.format === "linework" && trail.id === "parus") {
    for (const { id, name, aliases } of parusMapPlaces) {
      const label = findLabel(aliases);
      if (label) matches.push({ kind: "place", id, name, label });
    }
  }
  return matches;
}
