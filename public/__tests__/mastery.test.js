import test from "node:test";
import assert from "node:assert/strict";

import { initSubskill, updateMasteryAfterAnswer } from "../mastery.js";

test("mastery: 3 correct in a row => mastered", () => {
  let s = initSubskill("num-addition");

  s = updateMasteryAfterAnswer(s, true, "q1");
  assert.equal(s.streakCorrect, 1);
  assert.notEqual(s.status, "mastered");

  s = updateMasteryAfterAnswer(s, true, "q2");
  assert.equal(s.streakCorrect, 2);
  assert.notEqual(s.status, "mastered");

  s = updateMasteryAfterAnswer(s, true, "q3");
  assert.equal(s.streakCorrect, 3);
  assert.equal(s.status, "mastered");
});

test("mastery: incorrect resets streak and queues review", () => {
  let s = initSubskill("num-addition");

  s = updateMasteryAfterAnswer(s, true, "q1");
  s = updateMasteryAfterAnswer(s, false, "q2");

  assert.equal(s.streakCorrect, 0);
  assert.ok(s.scheduledReviewQueue.includes("q2"));
});
