import assert from "node:assert/strict";
import test from "node:test";
import { recommendationAreas, recommendedTrails } from "../src/trail-recommendations.ts";
import { trails, type UsgsTrail } from "../src/trail-catalog.ts";

const [falls, meadow, parus, scout] = trails;

function trail(id: string, name: string, park: string): UsgsTrail {
  return { id, name, park, format: "usgs-topo", details: "", info: "", lines: [] };
}

test("suggests other trails from both history areas and skips featured, saved, and logged trails", () => {
  const hikes = [{ trail: "Watchman", location: "Zion" }];
  const saved = [falls];
  const areas = recommendationAreas(saved, hikes, trails);
  assert.deepEqual(areas.map(({ key }) => key), [parus.park, falls.park]);
  const riverside = trail("riverside", "Riverside Walk", parus.park);
  const westRim = trail("west-rim", "West Rim Trail", parus.park);
  const candidates = new Map([
    [parus.park, [riverside, westRim, trail("watchman", "Watchman Trail", parus.park)]],
    [falls.park, [trail("duplicate-falls", falls.name, falls.park)]],
  ]);
  assert.deepEqual(recommendedTrails({ areas, candidates, catalog: trails, saved, hikes,
    featuredIds: new Set([falls.id, parus.id, scout.id]) }), [riverside, meadow, westRim]);
});

test("uses mapped coordinates for regional downloads and ignores unmatched journal text", () => {
  const saved = { ...trail("regional", "Regional Trail", "California"),
    lines: [[[-117.43, 34.25], [-117.42, 34.24]]] as UsgsTrail["lines"] };
  const areas = recommendationAreas([saved], [{ trail: "Morning hike", location: "My cabin" }], trails);
  assert.equal(areas.length, 1);
  assert.deepEqual("center" in areas[0] && areas[0].center, [-117.42, 34.24]);
  assert.deepEqual(recommendationAreas([], [{ trail: meadow.name, location: "" }], trails).map(({ key }) => key), [meadow.park]);
});
