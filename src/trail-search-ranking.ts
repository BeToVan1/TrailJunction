import { normalizeTrailName } from "./trail-catalog.ts";

function words(text: string) {
  return normalizeTrailName(text).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function trailNameRank(name: string, query: string) {
  const title = words(name);
  const needle = words(query);
  if (!needle || title === needle) return 0;
  if (title === `${needle} trail` || needle === `${title} trail`) return 1;
  if (title.startsWith(`${needle} `)) return 2;
  if (` ${title} `.includes(` ${needle} `)) return 3;
  if (needle.split(" ").every((term) => title.split(" ").some((word) => word.startsWith(term)))) return 4;
  return title.includes(needle) ? 5 : 6;
}

// Use a small set of routes featured in official park guides as a tie-breaker.
// USGS supplies trail geometry but the app has no trail-level visit counts.
const parkHighlights: Record<string, string[]> = {
  "zion national park": ["angels landing", "west rim", "scout lookout junction", "riverside walk", "canyon overlook",
    "parus", "watchman", "kayenta", "lower emerald pool", "middle emerald pool", "upper emerald pool"],
  "yosemite national park": ["mist", "half dome", "lower yosemite fall", "cooks meadow loop", "bridalveil fall",
    "four mile", "upper yosemite fall"],
};

function isParkHighlight(trail: { name: string; park: string }) {
  const park = words(trail.park.split(" · ")[0]);
  return parkHighlights[park]?.includes(words(trail.name).replace(/ trail$/, "")) ?? false;
}

export function sortTrailMatches<T extends { name: string; park: string }>(trails: readonly T[], query: string) {
  return trails.map((trail) => ({ trail, match: trailNameRank(trail.name, query), featured: isParkHighlight(trail) }))
    .sort((a, b) => a.match - b.match || Number(b.featured) - Number(a.featured) ||
      a.trail.name.localeCompare(b.trail.name) || a.trail.park.localeCompare(b.trail.park))
    .map(({ trail }) => trail);
}
