import type { RoutePack } from "./route.ts";

export const demoRoute: RoutePack = {
  id: "fern-creek-loop",
  version: 1,
  name: "Fern Creek Loop",
  kind: "demo",
  loop: ["trailhead", "footbridge", "ridge", "fern-fork"],
  junctions: [
    {
      id: "trailhead",
      name: "Trailhead",
      signLines: ["Fern Creek Trailhead"],
      point: { x: 0.23, y: 0.76 },
    },
    {
      id: "footbridge",
      name: "Footbridge",
      signLines: ["Fern Creek Footbridge"],
      point: { x: 0.22, y: 0.37 },
    },
    {
      id: "ridge",
      name: "Ridge Junction",
      signLines: ["Ridge Junction", "Trail Junction"],
      point: { x: 0.54, y: 0.2 },
    },
    {
      id: "fern-fork",
      name: "Fern Fork",
      signLines: ["Fern Fork", "Trail Junction"],
      point: { x: 0.62, y: 0.6 },
    },
    {
      id: "cedar-spur",
      name: "Cedar Spur",
      signLines: ["Cedar Spur", "To Fern Fork"],
      point: { x: 0.81, y: 0.78 },
    },
  ],
  segments: [
    { from: "trailhead", to: "footbridge", branch: "Footbridge" },
    { from: "footbridge", to: "ridge", branch: "Ridge Junction" },
    { from: "ridge", to: "fern-fork", branch: "Fern Fork" },
    { from: "fern-fork", to: "trailhead", branch: "Trailhead" },
    { from: "fern-fork", to: "cedar-spur", branch: "Cedar Spur" },
    { from: "cedar-spur", to: "fern-fork", branch: "To Fern Fork" },
  ],
};
