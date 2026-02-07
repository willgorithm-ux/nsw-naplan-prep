import test from "node:test";
import assert from "node:assert/strict";

import {
  createTimerState,
  updateTimerState,
  formatRemainingTime,
  isExpired,
} from "../sessionTimer.js";

test("timer: warning at 19 minutes (20-min session)", () => {
  // Make deterministic: override startTime
  const state = { ...createTimerState(20), startTime: 0 };

  const at19Min = updateTimerState(state, 19 * 60 * 1000);
  assert.equal(at19Min.currentStatus, "warning");
  assert.equal(isExpired(at19Min), false);
});

test("timer: expired at 20 minutes", () => {
  const state = { ...createTimerState(20), startTime: 0 };

  const at20Min = updateTimerState(state, 20 * 60 * 1000);
  assert.equal(at20Min.currentStatus, "expired");
  assert.equal(isExpired(at20Min), true);
});

test("timer: formatRemainingTime basic check", () => {
  const state = { ...createTimerState(20), startTime: 0 };

  const at10Min = updateTimerState(state, 10 * 60 * 1000);
  // 10 minutes elapsed => 10 minutes remaining => "10:00"
  assert.equal(formatRemainingTime(at10Min), "10:00");
});
