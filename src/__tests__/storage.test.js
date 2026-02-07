import test from "node:test";
import assert from "node:assert/strict";
import { initStorage, getStorage } from "../storage.js";

// Minimal localStorage polyfill for Node test environment
function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

test("storage: setProfile/getProfile round trip", async () => {
  globalThis.localStorage = makeLocalStorage();
  await initStorage();
  const storage = getStorage();

  await storage.setProfile({ nickname: "Georgia", avatar: "astronaut-1" });
  const profile = await storage.getProfile();
  
  assert.equal(profile.nickname, "Georgia");
  assert.equal(profile.avatar, "astronaut-1");
});

test("storage: getSettings returns defaults when missing", async () => {
  globalThis.localStorage = makeLocalStorage();
  await initStorage();
  const storage = getStorage();

  const settings = await storage.getSettings();
  assert.equal(settings.theme, "space");
  assert.equal(settings.soundOn, true);
  assert.equal(settings.avatar, "astronaut-1");
  assert.ok(settings.colors?.primary);
});

test("storage: getProgress returns default levels when missing", async () => {
  globalThis.localStorage = makeLocalStorage();
  await initStorage();
  const storage = getStorage();

  const progress = await storage.getProgress();
  assert.equal(progress.levels.numeracy, 1);
  assert.equal(progress.levels.reading, 1);
  assert.equal(progress.levels.conventions, 1);
  assert.equal(progress.levels.writing, 1);
  assert.equal(progress.totalGems, 0);
});

test("storage: setProgress/getProgress persists levels", async () => {
  globalThis.localStorage = makeLocalStorage();
  await initStorage();
  const storage = getStorage();

  await storage.setProgress({
    levels: { numeracy: 3, reading: 2, conventions: 1, writing: 1 },
    totalGems: 500
  });

  const progress = await storage.getProgress();
  assert.equal(progress.levels.numeracy, 3);
  assert.equal(progress.levels.reading, 2);
  assert.equal(progress.totalGems, 500);
});

test("storage: setSession/getSession round trip", async () => {
  globalThis.localStorage = makeLocalStorage();
  await initStorage();
  const storage = getStorage();

  const session = {
    module: 'numeracy',
    missionSize: 10,
    qIndex: 3,
    correctCount: 2,
    gemCount: 50
  };

  await storage.setSession(session);
  const retrieved = await storage.getSession();

  assert.equal(retrieved.module, 'numeracy');
  assert.equal(retrieved.qIndex, 3);
  assert.equal(retrieved.correctCount, 2);
});

test("storage: clearSession removes session", async () => {
  globalThis.localStorage = makeLocalStorage();
  await initStorage();
  const storage = getStorage();

  await storage.setSession({ module: 'reading', qIndex: 5 });
  await storage.clearSession();

  const session = await storage.getSession();
  assert.equal(session, null);
});
