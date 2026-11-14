import { demoMapPoints, fernForkBranches } from "./demo-route.ts";
import { normalizeSignLine } from "./route.ts";
import type { SignArrow, SignReading } from "./sign-reading.ts";

export const fernForkPaths = fernForkBranches.map(({ stop, destination }) => [
  demoMapPoints["fern-fork"].name, demoMapPoints[stop].name, demoMapPoints[destination].name,
] as const);

export const fernForkSample: SignArrow[] = fernForkBranches.map(({ direction, stop }) => ({
  label: demoMapPoints[stop].name, direction,
}));

export function findFernForkPath(destination: string) {
  const name = normalizeSignLine(destination);
  return fernForkPaths.find((path) => normalizeSignLine(path[2]) === name);
}

export function matchesFernForkSample(reading: SignReading) {
  return reading.readable && reading.arrows?.length === fernForkSample.length &&
    fernForkSample.every(({ label, direction }) =>
      reading.lines.some((line) => normalizeSignLine(line) === normalizeSignLine(label)) &&
      reading.arrows?.some((arrow) => normalizeSignLine(arrow.label) === normalizeSignLine(label) && arrow.direction === direction));
}
