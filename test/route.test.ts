import assert from "node:assert/strict";
import test from "node:test";

import { demoRoute } from "../src/demo-route.ts";
import { findRecovery, matchJunction } from "../src/route.ts";

const sharedLabelRoute = {
  ...demoRoute,
  junctions: demoRoute.junctions.map((junction) => ({
    ...junction,
    signLines: ["fern-fork", "cedar-spur"].includes(junction.id)
      ? [...junction.signLines, "Trail Junction"] : junction.signLines,
  })),
};

test("matches an exact sign line after normalizing spacing, case, and arrow glyphs", () => {
  const result = matchJunction(demoRoute, ["  CEDAR   Spur → "]);

  assert.equal(result.status, "candidate");
  assert.equal(result.junction.id, "cedar-spur");
  assert.deepEqual(result.evidence, ["cedar spur"]);
});

test("leaves shared sign text ambiguous", () => {
  const result = matchJunction(sharedLabelRoute, ["Trail Junction"]);

  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.junctions.map((junction) => junction.id), ["fern-fork", "cedar-spur"]);
});

test("uses a second sign line to resolve a shared label", () => {
  const result = matchJunction(sharedLabelRoute, ["Trail Junction", "Fern Fork"]);

  assert.equal(result.status, "candidate");
  assert.equal(result.junction.id, "fern-fork");
});

test("keeps conflicting evidence ambiguous", () => {
  const result = matchJunction(demoRoute, ["Fern Fork", "Cedar Spur"]);

  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.junctions.map((junction) => junction.id), ["fern-fork", "cedar-spur"]);
});

test("does not match an unreadable or unrelated sign", () => {
  for (const reading of [[], [" "], ["Road closed near Cedar Spur"], ["Visitor center"]]) {
    assert.deepEqual(matchJunction(demoRoute, reading), { status: "unmatched" });
  }
});

test("returns the marked branch from Cedar Spur to Fern Fork", () => {
  assert.deepEqual(findRecovery(demoRoute, "cedar-spur"), {
    status: "return",
    segments: [{ from: "cedar-spur", to: "fern-fork", branch: "To Fern Fork" }],
  });
});

test("distinguishes Fern Fork from an unknown junction", () => {
  assert.deepEqual(findRecovery(demoRoute, "fern-fork"), { status: "at-return-point" });
  assert.deepEqual(findRecovery(demoRoute, "unknown"), { status: "unavailable" });
});

test("returns to Fern Fork through the marked stop on either branch", () => {
  for (const [destination, stop] of [["rocky-point", "trailhead"], ["sloan-lake", "cedar-spur"]]) {
    const result = findRecovery(demoRoute, destination);
    assert.equal(result.status, "return");
    assert.deepEqual(result.segments.map(({ to }) => to), [stop, "fern-fork"]);
  }
});

test("does not infer a reverse connection from a one-way segment", () => {
  const pack = {
    ...demoRoute,
    segments: demoRoute.segments.filter((segment) => segment.from !== "cedar-spur"),
  };

  assert.deepEqual(findRecovery(pack, "cedar-spur"), { status: "unavailable" });
});

test("finds a marked multi-segment return even when the side trail has a cycle", () => {
  const pack = {
    ...demoRoute,
    junctions: [
      ...demoRoute.junctions,
      { id: "overlook", name: "Overlook", signLines: [], point: { x: 0.92, y: 0.85 } },
    ],
    segments: [
      ...demoRoute.segments,
      { from: "overlook", to: "cedar-spur", branch: "Cedar Spur" },
      { from: "cedar-spur", to: "overlook", branch: "Overlook" },
    ],
  };

  const result = findRecovery(pack, "overlook");
  assert.equal(result.status, "return");
  assert.deepEqual(result.segments.map((segment) => segment.to), ["cedar-spur", "fern-fork"]);
});
