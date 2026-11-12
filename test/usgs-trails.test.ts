import assert from "node:assert/strict";
import test from "node:test";
import { mapPoint, squareTrailExtent } from "../src/map-projection.ts";
import type { Coordinate } from "../src/trail-catalog.ts";
import { searchUsgsTrails } from "../src/usgs-trails.ts";

test("joins connected same-name USGS segments and separates distant trails", async (context) => {
  function feature(id: number, start: Coordinate, end: Coordinate) {
    return {
      attributes: { objectid: id, name: "Ridge Trail", lengthmiles: .5, sourceoriginator: "National Park Service" },
      geometry: { paths: [[start, end]] },
    };
  }
  const fetch = context.mock.method(globalThis, "fetch", async () => Response.json({
    features: [
      feature(1, [-112.95, 37.27], [-112.951, 37.27]),
      feature(3, [-112.952, 37.27], [-112.953, 37.27]),
      feature(4, [-119.56, 37.74], [-119.562, 37.74]),
      feature(2, [-112.951, 37.27], [-112.952, 37.27]),
    ],
  }));

  const { trails, limited } = await searchUsgsTrails("Ridge Trail", new AbortController().signal);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(limited, false);
  assert.deepEqual(trails.map((trail) => [trail.park, trail.lines.length, trail.details]), [
    ["California", 1, "0.5 mi mapped · National Park Service"],
    ["Utah", 3, "1.5 mi mapped · National Park Service"],
  ]);

  const lines = trails[1].lines;
  const extent = squareTrailExtent(lines);
  assert.equal(extent.east - extent.west, extent.north - extent.south);
  for (const line of lines) {
    for (const point of line) {
      const [x, y] = mapPoint(point, extent, 1200, 1200);
      assert.ok(x > 0 && x < 1200 && y > 0 && y < 1200);
    }
  }
});
