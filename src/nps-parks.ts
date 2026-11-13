import boundaries from "./nps-park-boundaries.json" with { type: "json" };
import type { Coordinate } from "./trail-catalog.ts";

type Bounds = [west: number, south: number, east: number, north: number];
export type Park = { code: string; name: string; bounds: Bounds; rings: Coordinate[][] };

const parks: Park[] = (boundaries as [string, string, Bounds, Coordinate[][]][]).map(([code, name, bounds, rings]) =>
  ({ code, name, bounds, rings }));

function words(name: string) {
  return name.normalize("NFD").replace(/\p{Mark}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchParkQuery(query: string): { park: Park; trailName: string } | undefined {
  const comma = query.lastIndexOf(",");
  const normalized = words(comma < 0 ? query : query.slice(comma + 1));
  const park = parks.find(({ name }) => {
    const full = words(name);
    return normalized === full || normalized === full.replace(/ national park(?: and preserve)?$/, "");
  });
  if (park) return { park, trailName: comma < 0 ? "" : query.slice(0, comma).trim() };
}

function contains([x, y]: Coordinate, ring: Coordinate[]) {
  let inside = false;
  for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i - 1];
    const [bx, by] = ring[i];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
  }
  return inside;
}

export function parkForLines(lines: Coordinate[][], preferred?: Park) {
  const points = lines.flatMap((line) => line.length ? [line[0], line[Math.floor(line.length / 2)], line[line.length - 1]] : []);
  function score(park: Park) {
    const [west, south, east, north] = park.bounds;
    return points.filter((point) => {
      const [x, y] = point;
      if (x < west || x > east || y < south || y > north) return false;
      return park.rings.reduce((inside, ring) => contains(point, ring) ? !inside : inside, false);
    }).length;
  }
  if (preferred) return score(preferred) ? preferred : undefined;
  let closest: Park | undefined;
  let best = 0;
  for (const park of parks) {
    const count = score(park);
    if (count > best) {
      closest = park;
      best = count;
    }
  }
  return closest;
}
