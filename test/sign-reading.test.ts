import assert from "node:assert/strict";
import test from "node:test";
import { parseSignReading } from "../src/sign-reading.ts";
import { findFernForkPath, matchesFernForkSample } from "../src/fern-fork.ts";

test("trims visible labels and ignores blank model output", () => {
  assert.deepEqual(parseSignReading('{"readable":true,"lines":[" Cedar Spur "," "]}'), {
    readable: true, lines: ["Cedar Spur"],
  });
  assert.deepEqual(parseSignReading('{"readable":true,"lines":[" "]}'), {
    readable: false, lines: [],
  });
});

test("discards sign words when the model marks the photo unreadable", () => {
  assert.deepEqual(parseSignReading('{"readable":false,"lines":["Cedar Spur"]}'), {
    readable: false, lines: [],
  });
});

test("rejects an unexpected response instead of letting it reach navigation", () => {
  for (const value of ["no", "null", '{"readable":true,"lines":[7]}', '{"lines":["Cedar Spur"]}']) {
    assert.throws(() => parseSignReading(value));
  }
});

test("Fern Fork accepts the staged arrows and routes to places beyond the sign", () => {
  const reading = parseSignReading(JSON.stringify({
    readable: true,
    lines: ["TRAILHEAD", "CEDAR SPUR"],
    arrows: [{ label: " Trailhead ", direction: "left" }, { label: "Cedar Spur", direction: "right" }],
  }));
  assert.equal(matchesFernForkSample(reading), true);
  assert.deepEqual(findFernForkPath("  rocky   POINT "), ["Fern Fork", "Trailhead", "Rocky Point"]);
  assert.deepEqual(findFernForkPath("Sloan Lake"), ["Fern Fork", "Cedar Spur", "Sloan Lake"]);
  assert.equal(findFernForkPath("Visitor Center"), undefined);
  reading.arrows![0].direction = "right";
  assert.equal(matchesFernForkSample(reading), false);
  assert.throws(() => parseSignReading('{"readable":true,"lines":["Trailhead"],"arrows":[{"label":"Trailhead","direction":"maybe"}]}'));
});
