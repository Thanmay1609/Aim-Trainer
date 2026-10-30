import test from "node:test";
import assert from "node:assert/strict";
import { clearSessions, importBackup, loadSessions, makeBackup, parseBackup, saveSession, STORAGE_KEY, validateRecord } from "../src/storage.mjs";

function sampleRecord(overrides = {}) {
  return {
    id: "sample-1",
    createdAt: "2026-10-30T03:00:00.000Z",
    mode: "flick",
    durationSeconds: 30,
    elapsedSeconds: 30,
    hits: 8,
    misses: 2,
    clicks: 10,
    accuracy: 80,
    averageReactionMs: 230,
    bestReactionMs: 180,
    onTargetMs: 0,
    onTargetPercent: null,
    score: 8,
    inputType: "mouse",
    ...overrides
  };
}

function attachFakeStorage() {
  const data = new Map();
  globalThis.localStorage = {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
  return data;
}

test("records enforce bounded and internally consistent values", () => {
  assert.equal(validateRecord(sampleRecord()), true);
  assert.equal(validateRecord(sampleRecord({ clicks: 11 })), false);
  assert.equal(validateRecord(sampleRecord({ accuracy: 140 })), false);
  assert.equal(validateRecord(sampleRecord({ inputType: "camera" })), false);
});

test("backup round trip sanitizes unknown properties", () => {
  const record = sampleRecord({ unexpected: "discard this" });
  const backup = makeBackup([record], "2026-10-30T04:00:00.000Z");
  const restored = parseBackup(backup);
  assert.equal(restored.length, 1);
  assert.equal(Object.hasOwn(restored[0], "unexpected"), false);
  assert.equal(restored[0].id, "sample-1");
});

test("backup parser rejects malformed, unsupported, oversized, or invalid records", () => {
  assert.throws(() => parseBackup("{"), /valid JSON/);
  assert.throws(() => parseBackup(JSON.stringify({ schemaVersion: 9, sessions: [] })), /not supported/);
  assert.throws(() => parseBackup("x".repeat(1_000_001)), /smaller than 1 MB/);
  assert.throws(() => parseBackup(JSON.stringify({ schemaVersion: 1, sessions: [sampleRecord({ hits: -1 })] })), /invalid session/);
});

test("local save, import merge, and delete operate through versioned storage", () => {
  const data = attachFakeStorage();
  assert.equal(saveSession(sampleRecord()), true);
  assert.equal(loadSessions().length, 1);
  const second = sampleRecord({ id: "sample-2", mode: "switch", hits: 4, misses: 3, clicks: 7, accuracy: 57, score: 4 });
  const result = importBackup(makeBackup([second]));
  assert.deepEqual(result, { imported: 1, saved: true });
  assert.equal(loadSessions().length, 2);
  assert.equal(data.has(STORAGE_KEY), true);
  assert.equal(clearSessions(), true);
  assert.equal(loadSessions().length, 0);
  delete globalThis.localStorage;
});
