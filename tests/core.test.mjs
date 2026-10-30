import test from "node:test";
import assert from "node:assert/strict";
import { advanceSession, createSession, getResults, isInsideTarget, recordClick, recordPointerType } from "../src/core.mjs";

test("session configuration accepts supported modes and rejects unknown ones", () => {
  assert.equal(createSession({ mode: "tracking", durationSeconds: 60 }).mode, "tracking");
  assert.throws(() => createSession({ mode: "leaderboard" }), /Unknown training mode/);
  assert.throws(() => createSession({ durationSeconds: 45 }), /Unsupported session length/);
});

test("target hit testing includes the edge and rejects points outside the radius", () => {
  const target = { x: 10, y: 10, radius: 5 };
  assert.equal(isInsideTarget({ x: 13, y: 14 }, target), true);
  assert.equal(isInsideTarget({ x: 16, y: 10 }, target), false);
  assert.equal(isInsideTarget({ x: Infinity, y: 10 }, target), false);
});

test("click scoring counts every attempt and measures reaction time only for hits", () => {
  const session = createSession({ mode: "flick" });
  recordClick(session, { hit: true, reactionMs: 244.7, inputType: "mouse" });
  recordClick(session, { hit: false, reactionMs: 91, inputType: "mouse" });
  recordClick(session, { hit: true, reactionMs: 310, inputType: "keyboard" });
  const result = getResults(session);
  assert.deepEqual([result.hits, result.misses, result.clicks, result.accuracy], [2, 1, 3, 67]);
  assert.equal(result.averageReactionMs, 278);
  assert.equal(result.inputType, "mixed");
});

test("tracking time is bounded per frame and produces an on-target rate", () => {
  const session = createSession({ mode: "tracking" });
  advanceSession(session, 100, true);
  advanceSession(session, 1000, true);
  advanceSession(session, 100, false);
  const result = getResults(session);
  assert.equal(result.onTargetMs, 200);
  assert.equal(result.elapsedSeconds, 1);
  assert.equal(result.onTargetPercent, 17);
  assert.equal(result.accuracy, null);
});

test("input modality remains stable until a different real input is used", () => {
  const session = createSession({ mode: "switch" });
  recordPointerType(session, "unknown");
  recordPointerType(session, "touch");
  recordPointerType(session, "touch");
  assert.equal(session.inputType, "touch");
  recordPointerType(session, "pen");
  assert.equal(session.inputType, "mixed");
});
