import test from "node:test";
import assert from "node:assert/strict";
import { updateLevelAfterMission } from "../leveling.js";

test("level up at >=80%", () => {
  assert.equal(updateLevelAfterMission(1, 8, 10), 2);
});

test("level down at <=50%", () => {
  assert.equal(updateLevelAfterMission(3, 5, 10), 2);
});

test("level stays between 50% and 80%", () => {
  assert.equal(updateLevelAfterMission(2, 6, 10), 2);
});
