export const MODE_DEFINITIONS = Object.freeze({
  flick: Object.freeze({ title: "Single target", label: "FLICK / PRECISION", arenaLabel: "STATIC ACQUISITION" }),
  switch: Object.freeze({ title: "Target switching", label: "TARGET SWITCHING", arenaLabel: "SEQUENTIAL ACQUISITION" }),
  tracking: Object.freeze({ title: "Moving target", label: "TRACKING", arenaLabel: "CONTINUOUS TRACK" })
});

export const SCENARIOS = Object.freeze([
  Object.freeze({ id: "steady-click", mode: "flick", name: "Steady Click", description: "Build a repeatable hit rhythm.", difficulty: "CORE", durationSeconds: 30, targetSize: "medium", targetCount: 1, trackingPattern: "sweep" }),
  Object.freeze({ id: "micro-control", mode: "flick", name: "Micro Control", description: "Small targets. Precise placement.", difficulty: "FOCUSED", durationSeconds: 60, targetSize: "small", targetCount: 1, trackingPattern: "sweep" }),
  Object.freeze({ id: "wide-snap", mode: "flick", name: "Wide Snap", description: "Warm up with a generous target.", difficulty: "WARM-UP", durationSeconds: 30, targetSize: "large", targetCount: 1, trackingPattern: "sweep" }),
  Object.freeze({ id: "three-point", mode: "switch", name: "Three Point", description: "Move cleanly through a short sequence.", difficulty: "CORE", durationSeconds: 30, targetSize: "medium", targetCount: 3, trackingPattern: "sweep" }),
  Object.freeze({ id: "crossfire-six", mode: "switch", name: "Crossfire Six", description: "Read the active mark across six points.", difficulty: "FOCUSED", durationSeconds: 60, targetSize: "medium", targetCount: 6, trackingPattern: "sweep" }),
  Object.freeze({ id: "precision-circuit", mode: "switch", name: "Precision Circuit", description: "Six small points. A longer control set.", difficulty: "ADVANCED", durationSeconds: 90, targetSize: "small", targetCount: 6, trackingPattern: "sweep" }),
  Object.freeze({ id: "smooth-sweep", mode: "tracking", name: "Smooth Sweep", description: "Stay with a steady, flowing path.", difficulty: "CORE", durationSeconds: 30, targetSize: "medium", targetCount: 1, trackingPattern: "sweep" }),
  Object.freeze({ id: "orbit-lock", mode: "tracking", name: "Orbit Lock", description: "Follow a looping figure-eight path.", difficulty: "FOCUSED", durationSeconds: 60, targetSize: "medium", targetCount: 1, trackingPattern: "orbit" }),
  Object.freeze({ id: "micro-trace", mode: "tracking", name: "Micro Trace", description: "Track a compact target with control.", difficulty: "ADVANCED", durationSeconds: 30, targetSize: "small", targetCount: 1, trackingPattern: "orbit" })
]);

export const SCENARIO_BY_ID = Object.freeze(Object.fromEntries(SCENARIOS.map((scenario) => [scenario.id, scenario])));
export const DEFAULT_SCENARIO_BY_MODE = Object.freeze({ flick: "steady-click", switch: "three-point", tracking: "smooth-sweep" });

export const ALLOWED_DURATIONS = Object.freeze([30, 60, 90]);
export const ALLOWED_TARGET_SIZES = Object.freeze(["large", "medium", "small"]);

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function isInsideTarget(point, target) {
  if (!point || !target || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  const radius = Math.max(0, target.radius);
  return distanceSquared(point, target) <= radius * radius;
}

export function createSession({ mode = "flick", scenarioId = DEFAULT_SCENARIO_BY_MODE[mode], durationSeconds = 30, targetSize = "medium", id = "", createdAt = "" } = {}) {
  if (!Object.hasOwn(MODE_DEFINITIONS, mode)) throw new TypeError("Unknown training mode.");
  if (!SCENARIO_BY_ID[scenarioId] || SCENARIO_BY_ID[scenarioId].mode !== mode) throw new TypeError("Unknown scenario for this training mode.");
  if (!ALLOWED_DURATIONS.includes(durationSeconds)) throw new TypeError("Unsupported session length.");
  if (!ALLOWED_TARGET_SIZES.includes(targetSize)) throw new TypeError("Unsupported target size.");
  return {
    id,
    createdAt,
    mode,
    scenarioId,
    durationSeconds,
    targetSize,
    elapsedMs: 0,
    clicks: 0,
    hits: 0,
    misses: 0,
    reactionTimes: [],
    onTargetMs: 0,
    inputType: "unknown"
  };
}

function mergeInputType(current, next) {
  const clean = ["mouse", "touch", "pen", "keyboard"].includes(next) ? next : "unknown";
  if (current === "unknown") return clean;
  if (clean === "unknown" || current === clean) return current;
  return "mixed";
}

export function recordClick(session, { hit, reactionMs = null, inputType = "unknown" } = {}) {
  session.clicks += 1;
  session.inputType = mergeInputType(session.inputType, inputType);
  if (hit) {
    session.hits += 1;
    if (Number.isFinite(reactionMs) && reactionMs >= 0 && reactionMs <= 60000) {
      session.reactionTimes.push(Math.round(reactionMs));
    }
  } else {
    session.misses += 1;
  }
  return session;
}

export function advanceSession(session, deltaMs, onTarget = false) {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return session;
  session.elapsedMs += deltaMs;
  if (session.mode === "tracking" && onTarget) {
    session.onTargetMs += Math.min(deltaMs, 100);
  }
  return session;
}

export function recordPointerType(session, pointerType) {
  session.inputType = mergeInputType(session.inputType, pointerType);
  return session;
}

export function getResults(session) {
  const accuracy = session.clicks > 0 ? Math.round((session.hits / session.clicks) * 100) : null;
  const reactions = session.reactionTimes;
  const averageReactionMs = reactions.length
    ? Math.round(reactions.reduce((sum, value) => sum + value, 0) / reactions.length)
    : null;
  const bestReactionMs = reactions.length ? Math.min(...reactions) : null;
  const onTargetPercent = session.mode === "tracking" && session.elapsedMs > 0
    ? Math.round((session.onTargetMs / session.elapsedMs) * 100)
    : null;
  return {
    hits: session.hits,
    misses: session.misses,
    clicks: session.clicks,
    accuracy,
    averageReactionMs,
    bestReactionMs,
    onTargetMs: Math.round(session.onTargetMs),
    onTargetPercent,
    score: session.mode === "tracking" ? Math.round(session.onTargetMs / 1000) : session.hits,
    elapsedSeconds: Math.max(0, Math.round(session.elapsedMs / 1000)),
    inputType: session.inputType
  };
}
