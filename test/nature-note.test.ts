import assert from "node:assert/strict";
import test from "node:test";
import { parseNatureNote } from "../src/nature-note.ts";

const shrub = { level: "unidentified", label: "Shrub with compound leaves",
  evidence: "Several shrubs have leaves divided into leaflets.", ecology: "Unsupported geographic claim.",
  nextPhoto: "Photograph one complete leaf where it meets the stem." };

test("an unidentified shrub gets explicit uncertainty, no inferred range, and a useful follow-up", () => {
  const { note } = parseNatureNote(JSON.stringify(shrub));
  assert.match(note, /can’t identify the species/);
  assert.match(note, /too broad/);
  assert.ok(note.includes(shrub.nextPhoto));
  assert.ok(!note.includes(shrub.ecology));
});

test("a group can have habitat information while its species remains uncertain", () => {
  const result = parseNatureNote(JSON.stringify({ ...shrub, level: "group", label: "Willow",
    ecology: "Many willows grow beside streams." }));
  assert.match(result.note, /can’t identify the species/);
  assert.match(result.note, /beside streams/);
});

test("a species note retains its ecology and a missing subject gets its own explanation", () => {
  const species = parseNatureNote(JSON.stringify({ ...shrub, level: "species", ecology: "Typical habitat." }));
  assert.match(species.note, /Typical habitat/);
  assert.ok(!species.note.includes(shrub.nextPhoto));
  const missing = parseNatureNote(JSON.stringify({ ...shrub, level: "no_subject" }));
  assert.equal(missing.label, "No clear subject");
  assert.ok(!missing.note.includes(shrub.ecology));
});

test("incomplete responses cannot overwrite a saved note", () => {
  for (const value of [{ ...shrub, level: "maybe" }, { ...shrub, nextPhoto: " " }, { label: "Shrub" }]) {
    assert.throws(() => parseNatureNote(JSON.stringify(value)));
  }
});
