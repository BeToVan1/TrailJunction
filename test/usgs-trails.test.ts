import assert from "node:assert/strict";
import test from "node:test";
import { mapPoint, squareTrailExtent } from "../src/map-projection.ts";
import type { Coordinate } from "../src/trail-catalog.ts";
import { matchParkQuery } from "../src/nps-parks.ts";
import { cachedUsgsTrails, searchUsgsTrails } from "../src/usgs-trails.ts";

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
  assert.deepEqual(trails.map((trail) => [trail.park, trail.parkCode, trail.lines.length, trail.details]), [
    ["Yosemite National Park", "yose", 1, "0.5 mi mapped · National Park Service"],
    ["Zion National Park", "zion", 3, "1.5 mi mapped · National Park Service"],
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

test("scopes a park search, filters out nearby trails, and reuses an equivalent search", async (context) => {
  const query = "Ridge, Zion";
  const fetch = context.mock.method(globalThis, "fetch", async (url: string) => {
    const params = new URL(url).searchParams;
    assert.equal(params.get("geometryType"), "esriGeometryEnvelope");
    assert.equal(params.get("geometry"), matchParkQuery(query)?.park.bounds.join(","));
    assert.match(params.get("where") ?? "", /LIKE '%RIDGE%'/);
    return Response.json({
      features: [
        { attributes: { objectid: 1, name: "Ridge Trail" }, geometry: { paths: [[[-112.95, 37.27], [-112.951, 37.27]]] } },
        { attributes: { objectid: 2, name: "Ridge Trail" }, geometry: { paths: [[[-113.16, 37.15], [-113.159, 37.15]]] } },
      ],
    });
  });
  assert.equal(matchParkQuery("Glacier Trail"), undefined);
  const { trails } = await searchUsgsTrails(query, new AbortController().signal);
  assert.deepEqual(trails.map(({ id, parkCode }) => [id, parkCode]), [["usgs-1", "zion"]]);
  assert.deepEqual(cachedUsgsTrails("RIDGE, Zion National Park")?.trails, trails);
  await searchUsgsTrails("RIDGE, Zion National Park", new AbortController().signal);
  assert.equal(fetch.mock.callCount(), 1);
});
