import { normalizeSignLine } from "./route.ts";
import type { SignArrow, SignReading } from "./sign-reading.ts";

export const fernForkPaths = [
  ["Fern Fork", "Trailhead", "Rocky Point"],
  ["Fern Fork", "Cedar Spur", "Sloan Lake"],
] as const;

export const fernForkSample: SignArrow[] = [
  { label: "Trailhead", direction: "left" },
  { label: "Cedar Spur", direction: "right" },
];

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
