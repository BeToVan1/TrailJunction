import assert from "node:assert/strict";
import test from "node:test";
import { matchSavedSignToMap } from "../src/saved-sign-map.ts";
import { trails, type UsgsTrail } from "../src/trail-catalog.ts";

const parus = trails[2];

test("an Appalachian Trail sign has no matches on the saved Pa’rus map", () => {
  const entries = [
    "OUTERBRIDGE SHELTER AND SPRING 0.7 MI.",
    "LEHIGH FURNACE GAP 5.1 MI.",
    "BAKE OVEN KNOB 9.1 MI.",
    "ROUTE 309 15.3 MI.",
    "LITTLE GAP 5.3 MI.",
  ].map((label) => ({ label, direction: "left" as const }));
  assert.deepEqual(matchSavedSignToMap(entries, parus), []);
});

test("identifies a saved trail and mapped Pa’rus places without treating a place as current location", () => {
  const matches = matchSavedSignToMap([
    { label: "← Pa'rus Trail 1.75 mi" },
    { label: "To Canyon Junction — 1.3 mi." },
    { label: "Pa’rus Trailhead 0.2" },
    { label: "Canyon Junction 1.30" },
    { label: "Visitor Center 2 mi" },
  ], parus);
  assert.deepEqual(matches, [
    { kind: "trail", name: "Pa’rus Trail", label: "← Pa'rus Trail 1.75 mi" },
    { kind: "place", id: "parus-trailhead", name: "Pa’rus Trailhead", label: "Pa’rus Trailhead 0.2" },
    { kind: "place", id: "canyon-junction", name: "Canyon Junction", label: "To Canyon Junction — 1.3 mi." },
  ]);
  assert.deepEqual(matchSavedSignToMap([{ label: "Canyon Junction 1 mi" }], trails[0]), []);
});

test("matches named USGS trail geometry without removing numerals from a trail name", () => {
  const trail: UsgsTrail = {
    id: "test-route", format: "usgs-topo", name: "Route 309", park: "Pennsylvania", details: "", info: "", lines: [],
  };
  assert.equal(matchSavedSignToMap([{ label: "ROUTE 309 15.3 MI." }], trail)[0]?.kind, "trail");
  assert.deepEqual(matchSavedSignToMap([{ label: "Route 89" }, { label: "Route 309 Alternate" }], trail), []);
});

test("Scout Lookout requires the junction heading and the arrow for each separate branch", () => {
  const scout = trails[3];
  const heading = { label: "SCOUT LOOKOUT" };
  const west = { label: "WEST RIM TRAIL", direction: "straight" as const };
  const angels = { label: "ANGELS LANDING 0.5", direction: "right" as const };
  assert.deepEqual(matchSavedSignToMap([heading, west, angels], scout).map(match => match.kind === "branch" && match.id),
    ["west-rim", "angels-landing"]);
  assert.deepEqual(matchSavedSignToMap([west, angels], scout), []);
  assert.deepEqual(matchSavedSignToMap([heading, { ...angels, direction: "left" }], scout), []);
});
