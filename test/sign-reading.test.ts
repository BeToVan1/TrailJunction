import assert from "node:assert/strict";
import test from "node:test";
import { describeSign, parseSignReading } from "../src/sign-reading.ts";
import { findFernForkPath, matchesFernForkSample } from "../src/fern-fork.ts";
import { matchRampartSign, rampartTrips } from "../src/rampart-junction.ts";

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

test("only shows unambiguous arrows attached to visible sign text", () => {
  const reading = parseSignReading(JSON.stringify({
    readable: true,
    lines: ["PA’RUS TRAIL", "Canyon Junction", "Visitor Center"],
    arrows: [
      { label: "PA’RUS TRAIL", direction: "straight" },
      { label: "Canyon Junction", direction: "left" },
      { label: "Canyon Junction", direction: "right" },
      { label: "Unseen destination", direction: "right" },
    ],
  }));
  assert.deepEqual(describeSign(reading, "Pa'rus"), {
    namesTrail: true,
    entries: [
      { label: "PA’RUS TRAIL", direction: "straight" },
      { label: "Canyon Junction", direction: undefined },
      { label: "Visitor Center", direction: undefined },
    ],
  });
  assert.equal(describeSign(reading, "Pa’rus Connector").namesTrail, false);
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

test("matches Longmire across formatting differences without mixing the two sign panels", () => {
  const longmire = rampartTrips[1];
  const right = { label: "Longmire 2.0", direction: "right" as const };
  const left = { label: "Longmire (3.00 mi)", direction: "left" as const };
  const reading = { readable: true, lines: ["LONGMIRE — 2.00 mi.", "LONGMIRE 3.0"], arrows: [right, left] };
  const review = () => describeSign(reading, "Rampart Ridge Junction").entries;
  assert.deepEqual(review(), [
    { label: "LONGMIRE — 2.00 mi.", direction: "right" },
    { label: "LONGMIRE 3.0", direction: "left" },
  ]);
  assert.equal(matchRampartSign(review(), longmire)?.label, "LONGMIRE — 2.00 mi.");
  assert.equal(matchRampartSign([{ label: "LONGMIRE (2,0 MILES).", direction: "right" }], longmire)?.direction, "right");
  for (const arrow of [left, { ...right, label: "Longmire" }, { ...right, label: "Longmire 2.1" }]) {
    reading.arrows = [arrow];
    assert.equal(matchRampartSign(review(), longmire), undefined);
    assert.equal(matchRampartSign([arrow], longmire), undefined);
  }
  reading.arrows = [right, { label: right.label, direction: "left" }];
  assert.equal(matchRampartSign(review(), longmire), undefined);
});
