import assert from "node:assert/strict";
import test from "node:test";
import { parseSignReading } from "../src/sign-reading.ts";

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
