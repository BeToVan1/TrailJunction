import type { HikeDetails } from "./journal.ts";
import { matchParkQuery } from "./nps-parks.ts";
import { normalizeTrailName, type Coordinate, type Trail } from "./trail-catalog.ts";
import { sortTrailMatches } from "./trail-search-ranking.ts";

export type HikeReference = Pick<HikeDetails, "trail" | "location">;
export type TrailReference = { name: string; park: string; lines?: Coordinate[][] };
export type RecommendationArea = { key: string; park: string; weight: number } |
  { key: string; center: Coordinate; weight: number };

function nameKey(name: string) {
  return normalizeTrailName(name).replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/ trail$/, "");
}

function parkName(place: string) {
  return matchParkQuery(place.split(" · ")[0])?.park.name;
}

function locationKey(location: string) {
  return normalizeTrailName(parkName(location) ?? location.split(" · ")[0]);
}

export function recommendationAreas(saved: readonly TrailReference[], hikes: readonly HikeReference[], catalog: readonly Trail[]) {
  const areas = new Map<string, RecommendationArea>();
  function add(area: RecommendationArea) {
    const existing = areas.get(area.key);
    if (existing) existing.weight += area.weight;
    else areas.set(area.key, area);
  }
  for (const trail of saved) {
    const park = parkName(trail.park);
    if (park) {
      add({ key: park, park, weight: 1 });
    } else {
      const line = trail.lines?.find((line) => line.length > 0);
      const center = line?.[Math.floor(line.length / 2)];
      if (center) add({ key: center.map((part) => part.toFixed(1)).join(","), center, weight: 1 });
    }
  }
  for (const hike of hikes) {
    // Resolve only familiar parks or names from the existing catalog. Free-form
    // journal text stays local and does not become an external search query.
    const matching = [...catalog, ...saved].filter(({ name, park }) =>
      nameKey(name) === nameKey(hike.trail) && (!hike.location || locationKey(park) === locationKey(hike.location)));
    const parks = [...new Set(matching.flatMap(({ park }) => parkName(park) ?? []))];
    const park = parkName(hike.location) ?? (parks.length === 1 ? parks[0] : undefined);
    if (park) add({ key: park, park, weight: 2 });
  }
  return [...areas.values()].sort((a, b) => b.weight - a.weight).slice(0, 3);
}

export function recommendedTrails({
  areas, candidates, catalog, saved, hikes, featuredIds,
}: {
  areas: readonly RecommendationArea[];
  candidates: ReadonlyMap<string, readonly Trail[]>;
  catalog: readonly Trail[];
  saved: readonly Trail[];
  hikes: readonly HikeReference[];
  featuredIds: ReadonlySet<string>;
}) {
  const ids = new Set([...featuredIds, ...saved.map(({ id }) => id)]);
  const seen = new Set([...catalog.filter(({ id }) => featuredIds.has(id)), ...saved]
    .map(({ name, park }) => `${nameKey(name)}|${locationKey(park)}`));
  const logged = new Map<string, Set<string>>();
  for (const { trail, location } of hikes) {
    const key = nameKey(trail);
    if (!logged.has(key)) logged.set(key, new Set());
    logged.get(key)!.add(locationKey(location));
  }

  const groups = areas.map((area) => {
    const remote = candidates.get(area.key) ?? [];
    const local = "park" in area ? catalog.filter(({ park }) => park === area.park) : [];
    return "park" in area ? sortTrailMatches([...local, ...remote], "") : [...remote];
  });
  const result: Trail[] = [];
  // Give each area one slot before recommending a second trail from any area.
  while (result.length < 3 && groups.some((group) => group.length)) {
    for (const group of groups) {
      if (result.length === 3) break;
      let trail: Trail | undefined;
      while ((trail = group.shift())) {
        const name = nameKey(trail.name);
        const location = locationKey(trail.park);
        const key = `${name}|${location}`;
        const hikeLocations = logged.get(name);
        if (ids.has(trail.id) || seen.has(key) || hikeLocations?.has("") || hikeLocations?.has(location)) continue;
        ids.add(trail.id);
        seen.add(key);
        result.push(trail);
        break;
      }
    }
  }
  return result;
}
