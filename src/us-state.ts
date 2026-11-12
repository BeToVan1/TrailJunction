import boundaries from "./us-state-boundaries.json" with { type: "json" };
import type { Coordinate } from "./trail-catalog.ts";

const states = boundaries as [name: string, rings: Coordinate[][]][];

function contains([x, y]: Coordinate, ring: Coordinate[]) {
  let inside = false;
  for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i - 1];
    const [bx, by] = ring[i];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
  }
  return inside;
}

export function stateForPoint(point: Coordinate) {
  return states.find(([, rings]) => rings.some((ring) => contains(point, ring)))?.[0];
}
