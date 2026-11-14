import type { RoutePack } from "./route.ts";

export const demoMapWidth = 360;
export const demoMapHeight = 280;

export const demoMapPoints = {
  trailhead: { name: "Trailhead", x: 97, y: 136 },
  footbridge: { name: "Footbridge", x: 54, y: 198 },
  ridge: { name: "Ridge Junction", x: 173, y: 257 },
  "fern-fork": { name: "Fern Fork", x: 180, y: 196 },
  "cedar-spur": { name: "Cedar Spur", x: 263, y: 136 },
  "rocky-point": { name: "Rocky Point", x: 75, y: 48 },
  "sloan-lake": { name: "Sloan Lake", x: 285, y: 48 },
} as const;

export const fernForkBranches = [
  { direction: "left", stop: "trailhead", destination: "rocky-point" },
  { direction: "right", stop: "cedar-spur", destination: "sloan-lake" },
] as const;

type DemoPointId = keyof typeof demoMapPoints;

export const fernForkLegs = [
  { from: "ridge", to: "fern-fork", d: "M180 196C169 219 185 230 177 245Q174 251 173 257" },
  { from: "fern-fork", to: "trailhead", d: "M180 196C157 175 138 179 118 162S105 147 97 136" },
  { from: "trailhead", to: "rocky-point", d: "M97 136C100 116 119 103 109 86S74 74 75 48" },
  { from: "fern-fork", to: "cedar-spur", d: "M180 196C202 174 225 178 244 158S253 145 263 136" },
  { from: "cedar-spur", to: "sloan-lake", d: "M263 136C258 115 239 105 252 88S283 76 285 48" },
] satisfies readonly { from: DemoPointId; to: DemoPointId; d: string }[];

function demoJunction(id: DemoPointId, signLines: readonly string[]) {
  const { name, x, y } = demoMapPoints[id];
  return { id, name, signLines, point: { x: x / demoMapWidth, y: y / demoMapHeight } };
}

export const demoRoute: RoutePack = {
  id: "fern-creek-loop",
  version: 1,
  name: "Fern Creek Loop",
  kind: "demo",
  loop: ["trailhead", "footbridge", "ridge", "fern-fork"],
  junctions: [
    demoJunction("trailhead", ["Fern Creek Trailhead"]),
    demoJunction("footbridge", ["Fern Creek Footbridge"]),
    demoJunction("ridge", ["Ridge Junction", "Trail Junction"]),
    demoJunction("fern-fork", ["Fern Fork", "Trail Junction"]),
    demoJunction("cedar-spur", ["Cedar Spur", "To Fern Fork"]),
    demoJunction("rocky-point", ["Rocky Point"]),
    demoJunction("sloan-lake", ["Sloan Lake"]),
  ],
  segments: [
    { from: "trailhead", to: "footbridge", branch: "Footbridge" },
    { from: "footbridge", to: "ridge", branch: "Ridge Junction" },
    { from: "ridge", to: "fern-fork", branch: "Fern Fork" },
    ...fernForkBranches.flatMap(({ stop, destination }) => [
      { from: "fern-fork", to: stop, branch: demoMapPoints[stop].name },
      { from: stop, to: destination, branch: demoMapPoints[destination].name },
      { from: destination, to: stop, branch: `To ${demoMapPoints[stop].name}` },
    ]),
    { from: "cedar-spur", to: "fern-fork", branch: "To Fern Fork" },
  ],
};
