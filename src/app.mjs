import { DEFAULT_SCENARIO_BY_MODE, MODE_DEFINITIONS, SCENARIOS, SCENARIO_BY_ID, advanceSession, createSession, getResults, isInsideTarget, recordClick, recordPointerType } from "./core.mjs";
import { clearSessions, importBackup, loadSessions, makeBackup, saveSession } from "./storage.mjs";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#arena");
const context = canvas.getContext("2d");
const arenaFrame = $("#arena-frame");
const state = {
  mode: "flick",
  scenarioId: DEFAULT_SCENARIO_BY_MODE.flick,
  durationSeconds: 30,
  targetSize: "medium",
  playlist: null,
  playlistIndex: 0,
  status: "idle",
  session: null,
  frameId: 0,
  lastFrameAt: 0,
  targetSpawnAt: 0,
  targets: [],
  currentTargetIndex: 0,
  pointer: null,
  pointerType: "unknown",
  pointerActive: false,
  keyboardAim: { x: 0.5, y: 0.5 },
  trail: [],
  countdownTimer: 0,
  lastKeyboardTrackingState: null
};

const modeContent = {
  flick: {
    instructions: "Click the target as accurately as you can. Keyboard: focus the arena, move with arrow keys, and press Space to score.",
    secondLine: "STATIC ACQUISITION"
  },
  switch: {
    instructions: "Follow the sequence across each highlighted target. Keyboard: use arrow keys and Space.",
    secondLine: "SEQUENTIAL ACQUISITION"
  },
  tracking: {
    instructions: "Move your pointer to follow the target. Touch players: keep your finger on target. Keyboard: use arrow keys.",
    secondLine: "CONTINUOUS TRACK"
  }
};

const modeNames = { flick: "Flick / precision", switch: "Target switching", tracking: "Tracking" };
const sizeRadius = { large: 28, medium: 21, small: 15 };
const resultColumns = [...document.querySelectorAll("#result-panel .result-grid span")];
const liveColumns = [...document.querySelectorAll(".live-stats .live-stat-label")];

function makeId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  return "run-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

function getArenaSize() {
  const rect = canvas.getBoundingClientRect();
  return { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2.5);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawArena();
}

function getRadius() {
  const base = sizeRadius[state.targetSize] || sizeRadius.medium;
  return globalThis.matchMedia && globalThis.matchMedia("(any-pointer: coarse)").matches ? Math.max(base, 27) : base;
}

function randomPoint(radius, width, height) {
  const marginX = Math.min(0.16, radius / width + 0.06);
  const marginY = Math.min(0.2, radius / height + 0.12);
  return {
    x: marginX + Math.random() * (1 - marginX * 2),
    y: marginY + Math.random() * (1 - marginY * 2),
    radius
  };
}

function createTargets() {
  const { width, height } = getArenaSize();
  const radius = getRadius();
  if (state.mode === "switch") {
    const count = SCENARIO_BY_ID[state.scenarioId].targetCount;
    if (count === 3) {
      const spread = Math.min(0.28, (radius * 2.5) / width);
      state.targets = [
        { x: 0.27, y: 0.35, radius },
        { x: 0.73, y: 0.62, radius },
        { x: 0.5 + spread * 0.2, y: 0.43, radius }
      ];
    } else {
      state.targets = Array.from({ length: count }, (_, index) => ({
        x: [0.2, 0.5, 0.8][index % 3],
        y: index < 3 ? 0.34 : 0.68,
        radius
      }));
    }
    state.currentTargetIndex = 0;
  } else if (state.mode === "tracking") {
    state.targets = [{ x: 0.5, y: 0.5, radius }];
    state.trail = [];
  } else {
    state.targets = [randomPoint(radius, width, height)];
  }
}

function trackingTarget() {
  const elapsed = state.session ? state.session.elapsedMs : 0;
  const speed = globalThis.matchMedia && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.00055 : 0.00105;
  const phase = elapsed * speed;
  const scenario = SCENARIO_BY_ID[state.scenarioId];
  if (scenario.trackingPattern === "orbit") {
    return {
      x: 0.5 + 0.29 * Math.cos(phase),
      y: 0.5 + 0.21 * Math.sin(phase * 2),
      radius: getRadius()
    };
  }
  return {
    x: 0.5 + 0.31 * Math.sin(phase),
    y: 0.5 + 0.2 * Math.sin(phase * 0.73 + 1.15),
    radius: getRadius()
  };
}

function getTargetsForDraw() {
  if (state.mode === "tracking" && state.status === "running") return [trackingTarget()];
  return state.targets;
}

function toPixel(target, width, height) {
  return { x: target.x * width, y: target.y * height, radius: target.radius };
}

function drawTarget(target, width, height, active, number) {
  const point = toPixel(target, width, height);
  context.save();
  context.globalAlpha = active ? 1 : 0.36;
  context.strokeStyle = active ? "#d3ff62" : "#86d8dc";
  context.fillStyle = active ? "rgba(211,255,98,.08)" : "rgba(134,216,220,.03)";
  context.lineWidth = 1.25;
  context.beginPath();
  context.arc(point.x, point.y, point.radius + 7, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
  context.strokeStyle = active ? "#f0f3ec" : "#86d8dc";
  context.lineWidth = 1;
  context.stroke();
  context.beginPath();
  context.arc(point.x, point.y, Math.max(3, point.radius * 0.17), 0, Math.PI * 2);
  context.fillStyle = active ? "#d3ff62" : "#86d8dc";
  context.fill();
  const tick = 5;
  context.strokeStyle = active ? "#d3ff62" : "#86d8dc";
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(point.x, point.y - point.radius - tick); context.lineTo(point.x, point.y - point.radius - tick - 5);
  context.moveTo(point.x, point.y + point.radius + tick); context.lineTo(point.x, point.y + point.radius + tick + 5);
  context.moveTo(point.x - point.radius - tick, point.y); context.lineTo(point.x - point.radius - tick - 5, point.y);
  context.moveTo(point.x + point.radius + tick, point.y); context.lineTo(point.x + point.radius + tick + 5, point.y);
  context.stroke();
  if (number) {
    context.fillStyle = active ? "#d3ff62" : "#a0adaa";
    context.font = "9px SFMono-Regular, Consolas, monospace";
    context.textAlign = "center";
    context.fillText(String(number).padStart(2, "0"), point.x, point.y + point.radius + 23);
  }
  context.restore();
}

function drawArena() {
  if (!context) return;
  const { width, height } = getArenaSize();
  context.clearRect(0, 0, width, height);
  context.save();
  context.strokeStyle = "rgba(134,216,220,.065)";
  context.lineWidth = 1;
  const grid = 38;
  for (let x = 0; x < width; x += grid) {
    context.beginPath(); context.moveTo(x + 0.5, 34); context.lineTo(x + 0.5, height - 34); context.stroke();
  }
  for (let y = 34; y < height - 28; y += grid) {
    context.beginPath(); context.moveTo(18, y + 0.5); context.lineTo(width - 18, y + 0.5); context.stroke();
  }
  const horizon = height * 0.54;
  context.strokeStyle = "rgba(134,216,220,.08)";
  context.beginPath(); context.moveTo(width * 0.1, horizon); context.lineTo(width * 0.9, horizon); context.stroke();
  context.strokeStyle = "rgba(134,216,220,.045)";
  for (let x = -width; x < width * 2; x += width / 12) {
    context.beginPath(); context.moveTo(width / 2, horizon); context.lineTo(x, height - 25); context.stroke();
  }
  context.restore();

  if (state.mode === "tracking" && state.status === "running") {
    const target = trackingTarget();
    const point = toPixel(target, width, height);
    state.trail.push({ x: point.x, y: point.y });
    if (state.trail.length > 12) state.trail.shift();
    state.trail.forEach((trailPoint, index) => {
      context.beginPath();
      context.arc(trailPoint.x, trailPoint.y, 2 + (index / 12) * 3, 0, Math.PI * 2);
      context.fillStyle = "rgba(134,216,220," + (0.08 + (index / 12) * 0.18) + ")";
      context.fill();
    });
  }

  const targets = getTargetsForDraw();
  for (let index = 0; index < targets.length; index += 1) {
    const active = state.mode !== "switch" || index === state.currentTargetIndex;
    drawTarget(targets[index], width, height, active, state.mode === "switch" ? index + 1 : 0);
  }
  if (state.pointer && state.status === "running") {
    const point = toPixel(state.pointer, width, height);
    context.save();
    context.strokeStyle = "rgba(240,243,236,.42)";
    context.lineWidth = 1;
    context.beginPath(); context.moveTo(point.x - 7, point.y); context.lineTo(point.x + 7, point.y); context.stroke();
    context.beginPath(); context.moveTo(point.x, point.y - 7); context.lineTo(point.x, point.y + 7); context.stroke();
    context.restore();
  }
}

function updateTimer() {
  const active = state.status === "running" || state.status === "paused";
  const remaining = active && state.session ? Math.max(0, state.durationSeconds * 1000 - state.session.elapsedMs) : state.durationSeconds * 1000;
  const totalSeconds = Math.ceil(remaining / 1000);
  $("#timer-value").textContent = String(Math.floor(totalSeconds / 60)).padStart(2, "0") + ":" + String(totalSeconds % 60).padStart(2, "0");
}

function setSessionState(label, type = "ready") {
  $("#session-state-label").textContent = label;
  const led = $("#state-led");
  led.classList.toggle("is-running", type === "running");
  led.classList.toggle("is-paused", type === "paused");
}

function updateLiveStats() {
  if (!state.session) return;
  const results = getResults(state.session);
  if (state.mode === "tracking") {
    liveColumns[0].textContent = "TIME ON TARGET";
    liveColumns[1].textContent = "TRACK RATE";
    liveColumns[2].textContent = "ACTIVE TIME";
    liveColumns[3].parentElement.hidden = true;
    $("#live-hits").textContent = (results.onTargetMs / 1000).toFixed(1) + "s";
    $("#live-accuracy").textContent = (results.onTargetPercent ?? 0) + "%";
    $("#live-third").textContent = results.elapsedSeconds + "s";
  } else {
    liveColumns[0].textContent = "HITS";
    liveColumns[1].textContent = "ACCURACY";
    liveColumns[2].textContent = "AVG. REACTION";
    liveColumns[3].textContent = "MISSES";
    liveColumns[3].parentElement.hidden = false;
    $("#live-hits").textContent = String(results.hits);
    $("#live-accuracy").textContent = (results.accuracy ?? 0) + "%";
    $("#live-third").textContent = results.averageReactionMs === null ? "—" : results.averageReactionMs + "ms";
    $("#live-score").textContent = String(results.misses);
  }
}

function updateModeView() {
  const definition = MODE_DEFINITIONS[state.mode];
  const scenario = SCENARIO_BY_ID[state.scenarioId];
  $("#mode-kicker").textContent = definition.label;
  $("#mode-title").textContent = scenario.name;
  $("#mode-instructions").textContent = modeContent[state.mode].instructions;
  $("#arena-mode-label").textContent = modeContent[state.mode].secondLine;
  const tracking = state.mode === "tracking";
  if (tracking) {
    liveColumns[0].textContent = "TIME ON TARGET";
    liveColumns[1].textContent = "TRACK RATE";
    liveColumns[2].textContent = "ACTIVE TIME";
    liveColumns[3].parentElement.hidden = true;
    resultColumns[0].textContent = "TIME ON TARGET";
    resultColumns[1].textContent = "ON TARGET";
    resultColumns[2].textContent = "ACTIVE TIME";
    resultColumns[3].textContent = "TRACK SCORE";
  } else {
    liveColumns[0].textContent = "HITS";
    liveColumns[1].textContent = "ACCURACY";
    liveColumns[2].textContent = "AVG. REACTION";
    liveColumns[3].textContent = "MISSES";
    liveColumns[3].parentElement.hidden = false;
    resultColumns[0].textContent = "HITS";
    resultColumns[1].textContent = "ACCURACY";
    resultColumns[2].textContent = "AVG. REACTION";
    resultColumns[3].textContent = "MISSES";
  }
}

function setMode(mode) {
  if (state.status === "running" || state.status === "paused" || state.status === "countdown") return;
  if (!Object.hasOwn(MODE_DEFINITIONS, mode) || mode === state.mode) return;
  setScenario(DEFAULT_SCENARIO_BY_MODE[mode]);
}

function scenarioPersonalBest(scenarioId, durationSeconds, targetSize) {
  const scenario = SCENARIO_BY_ID[scenarioId];
  const matching = loadSessions().filter((record) => record.scenarioId === scenarioId && record.durationSeconds === durationSeconds && record.targetSize === targetSize);
  if (!matching.length) return "—";
  if (scenario.mode === "tracking") return Math.max(...matching.map((record) => record.onTargetPercent ?? 0)) + "% track rate";
  return Math.max(...matching.map((record) => record.hits)) + " hits";
}

function renderScenarioList() {
  const search = $("#scenario-search").value.trim().toLocaleLowerCase();
  const matches = SCENARIOS.filter((scenario) => scenario.mode === state.mode && (scenario.name + " " + scenario.description + " " + scenario.difficulty).toLocaleLowerCase().includes(search));
  const list = $("#scenario-list");
  list.replaceChildren();
  $("#scenario-count").textContent = String(matches.length).padStart(2, "0") + (matches.length === 1 ? " TASK" : " TASKS");
  $("#scenario-empty").hidden = matches.length > 0;
  for (const scenario of matches) {
    const selected = scenario.id === state.scenarioId;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scenario-card" + (selected ? " is-selected" : "");
    button.dataset.scenario = scenario.id;
    button.setAttribute("aria-pressed", String(selected));

    const header = document.createElement("span");
    header.className = "scenario-card-header";
    const name = document.createElement("span");
    name.className = "scenario-name";
    name.textContent = scenario.name;
    const difficulty = document.createElement("span");
    difficulty.className = "scenario-difficulty";
    difficulty.textContent = scenario.difficulty;
    header.append(name, difficulty);

    const description = document.createElement("span");
    description.className = "scenario-description";
    description.textContent = scenario.description;

    const meta = document.createElement("span");
    meta.className = "scenario-meta";
    const setting = document.createElement("span");
    setting.textContent = scenario.durationSeconds + " SEC";
    const size = document.createElement("span");
    size.textContent = scenario.targetSize.toUpperCase() + " TARGET";
    meta.append(setting, size);
    if (scenario.mode === "switch") {
      const count = document.createElement("span");
      count.textContent = scenario.targetCount + " POINTS";
      meta.append(count);
    } else if (scenario.mode === "tracking") {
      const path = document.createElement("span");
      path.textContent = scenario.trackingPattern === "orbit" ? "FIGURE EIGHT" : "SWEEP";
      meta.append(path);
    }

    const best = document.createElement("span");
    best.className = "scenario-best";
    const bestLabel = document.createElement("span");
    bestLabel.textContent = "LOCAL PB";
    const bestValue = document.createElement("strong");
    bestValue.textContent = scenarioPersonalBest(scenario.id, scenario.durationSeconds, scenario.targetSize);
    best.append(bestLabel, bestValue);
    button.append(header, description, meta, best);
    list.append(button);
  }
  $("#current-best").textContent = "LOCAL PB · " + scenarioPersonalBest(state.scenarioId, state.durationSeconds, state.targetSize);
}

function clearPlaylist() {
  state.playlist = null;
  state.playlistIndex = 0;
  $("#stop-playlist").hidden = true;
  $("#start-button").disabled = false;
  $("#again-button").textContent = "Run it again";
}

function setScenario(scenarioId, returnFocus = false, preservePlaylist = false) {
  if (state.status === "running" || state.status === "paused" || state.status === "countdown") return;
  const scenario = SCENARIO_BY_ID[scenarioId];
  if (!scenario) return;
  if (!preservePlaylist) clearPlaylist();
  dismissResultForSetupChange();
  state.scenarioId = scenario.id;
  state.mode = scenario.mode;
  state.durationSeconds = scenario.durationSeconds;
  state.targetSize = scenario.targetSize;
  state.lastKeyboardTrackingState = null;
  document.querySelectorAll("[data-mode]").forEach((button) => {
    const selected = button.dataset.mode === state.mode;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll("[data-duration]").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.duration) === state.durationSeconds)));
  $("#target-size").value = state.targetSize;
  updateModeView();
  renderScenarioList();
  updateTimer();
  createTargets();
  drawArena();
  if (returnFocus) $("#scenario-list [data-scenario='" + scenario.id + "']").focus({ preventScroll: true });
}

function startWarmupPlaylist() {
  if (state.status === "running" || state.status === "paused" || state.status === "countdown") return;
  state.playlist = ["steady-click", "three-point", "smooth-sweep"];
  state.playlistIndex = 0;
  setScenario(state.playlist[0], false, true);
  startCountdown();
}

function continuePlaylist() {
  if (state.playlist && state.playlistIndex < state.playlist.length - 1) {
    state.playlistIndex += 1;
    setScenario(state.playlist[state.playlistIndex], false, true);
    startCountdown();
    return;
  }
  startCountdown();
}

function stopPlaylist() {
  clearPlaylist();
  $("#result-note").textContent = "Warm-up stopped. Your completed scenarios remain saved on this device.";
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
    state.pointer = null;
    state.pointerActive = false;
    return false;
  }
  state.pointer = {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    radius: 0
  };
  state.pointerType = event.pointerType || "mouse";
  if (state.session) recordPointerType(state.session, state.pointerType);
  const xValue = (state.pointer.x * 100).toFixed(1).padStart(4, "0");
  const yValue = (state.pointer.y * 100).toFixed(1).padStart(4, "0");
  $("#arena-coordinate").textContent = "X " + xValue + " / Y " + yValue;
  $("#input-hint").textContent = state.pointerType === "touch" ? "TOUCH INPUT" : state.pointerType === "pen" ? "PEN INPUT" : "MOUSE INPUT";
  return true;
}

function newFlickTarget() {
  const { width, height } = getArenaSize();
  return randomPoint(getRadius(), width, height);
}

function currentClickTarget() {
  if (state.mode === "tracking") return null;
  if (state.mode === "switch") return state.targets[state.currentTargetIndex];
  return state.targets[0];
}

function handleArenaDown(event) {
  if (state.status !== "running") return;
  if (event.pointerType !== "touch" && event.button !== 0) return;
  event.preventDefault();
  if (event.pointerType !== "mouse") {
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
  }
  updatePointer(event);
  state.pointerActive = true;
  if (state.mode === "tracking") return;
  registerClick(state.pointer, state.pointerType);
}

function registerClick(normalizedPoint, inputType) {
  const { width, height } = getArenaSize();
  const target = currentClickTarget();
  const point = { x: normalizedPoint.x * width, y: normalizedPoint.y * height };
  const hit = isInsideTarget(point, toPixel(target, width, height));
  recordClick(state.session, { hit, reactionMs: hit ? performance.now() - state.targetSpawnAt : null, inputType });
  if (hit) {
    if (state.mode === "switch") state.currentTargetIndex = (state.currentTargetIndex + 1) % state.targets.length;
    else state.targets = [newFlickTarget()];
    state.targetSpawnAt = performance.now();
  }
  updateLiveStats();
  if (inputType === "keyboard") {
    const results = getResults(state.session);
    $("#game-feedback").textContent = hit
      ? "Hit. " + results.hits + " targets hit."
      : "Miss. " + results.misses + " misses.";
  }
  drawArena();
}

function handleArenaMove(event) {
  if (state.status !== "running") return;
  if (!updatePointer(event)) { drawArena(); return; }
  if (event.pointerType === "mouse") state.pointerActive = true;
  drawArena();
}

function handleArenaUp(event) {
  if (event.pointerType !== "mouse") {
    state.pointerActive = false;
    state.pointer = null;
  }
}

function handleCanvasKey(event) {
  if (state.status !== "running" || !state.session) return;
  const step = event.shiftKey ? 0.055 : 0.028;
  const point = state.keyboardAim;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    if (event.key === "ArrowLeft") point.x = Math.max(0, point.x - step);
    if (event.key === "ArrowRight") point.x = Math.min(1, point.x + step);
    if (event.key === "ArrowUp") point.y = Math.max(0, point.y - step);
    if (event.key === "ArrowDown") point.y = Math.min(1, point.y + step);
    state.pointer = { x: point.x, y: point.y, radius: 0 };
    state.pointerType = "keyboard";
    state.pointerActive = true;
    recordPointerType(state.session, "keyboard");
    $("#input-hint").textContent = "KEYBOARD INPUT";
    if (state.mode === "tracking") {
      const { width, height } = getArenaSize();
      const onTarget = isInsideTarget({ x: point.x * width, y: point.y * height }, toPixel(trackingTarget(), width, height));
      if (state.lastKeyboardTrackingState !== onTarget) {
        state.lastKeyboardTrackingState = onTarget;
        $("#game-feedback").textContent = onTarget ? "On target." : "Off target.";
      }
    }
    drawArena();
    return;
  }
  if ((event.code === "Space" || event.key === " ") && state.mode !== "tracking") {
    event.preventDefault();
    if (event.repeat) return;
    state.pointer = { x: point.x, y: point.y, radius: 0 };
    state.pointerType = "keyboard";
    state.pointerActive = true;
    registerClick(point, "keyboard");
    drawArena();
  }
}

function handleArenaLeave(event) {
  if (event.pointerType === "mouse") {
    state.pointerActive = false;
    state.pointer = null;
  }
}

function setControlsDisabled(disabled) {
  document.querySelectorAll("[data-mode], [data-duration], [data-scenario]").forEach((button) => { button.disabled = disabled; });
  $("#scenario-search").disabled = disabled;
  $("#start-playlist").disabled = disabled;
  $("#target-size").disabled = disabled;
}

function startCountdown() {
  window.clearInterval(state.countdownTimer);
  state.session = null;
  state.status = "countdown";
  updateTimer();
  setControlsDisabled(true);
  $("#result-panel").hidden = true;
  $("#arena-empty").hidden = true;
  $("#pause-layer").hidden = true;
  $("#countdown-layer").hidden = false;
  $("#start-button").disabled = true;
  $("#pause-button").disabled = true;
  $("#end-button").disabled = true;
  setSessionState("GET READY");
  let count = 3;
  $("#countdown-number").textContent = String(count);
  state.countdownTimer = window.setInterval(() => {
    count -= 1;
    if (count <= 0) {
      window.clearInterval(state.countdownTimer);
      $("#countdown-layer").hidden = true;
      beginSession();
    } else {
      $("#countdown-number").textContent = String(count);
    }
  }, 700);
}

function beginSession() {
  state.session = createSession({ mode: state.mode, scenarioId: state.scenarioId, durationSeconds: state.durationSeconds, targetSize: state.targetSize, id: makeId() });
  state.sessionStartAt = new Date().toISOString();
  state.status = "running";
  state.pointer = null;
  state.pointerActive = false;
  state.lastKeyboardTrackingState = null;
  state.trail = [];
  createTargets();
  state.targetSpawnAt = performance.now();
  state.lastFrameAt = performance.now();
  $("#arena").classList.add("is-playing");
  $("#start-button").disabled = true;
  $("#pause-button").disabled = false;
  $("#pause-button").textContent = "Pause";
  $("#end-button").disabled = false;
  setSessionState("IN SESSION", "running");
  canvas.focus({ preventScroll: true });
  $("#session-announcement").textContent = modeNames[state.mode] + " session started. " + state.durationSeconds + " seconds.";
  updateLiveStats();
  resizeCanvas();
  state.frameId = requestAnimationFrame(frame);
}

function frame(now) {
  if (state.status !== "running" || !state.session) return;
  const remainingMs = Math.max(0, state.durationSeconds * 1000 - state.session.elapsedMs);
  const delta = Math.min(100, Math.max(0, now - state.lastFrameAt), remainingMs);
  state.lastFrameAt = now;
  let onTarget = false;
  if (state.mode === "tracking" && state.pointer && state.pointerActive) {
    const { width, height } = getArenaSize();
    onTarget = isInsideTarget(
      { x: state.pointer.x * width, y: state.pointer.y * height },
      toPixel(trackingTarget(), width, height)
    );
  }
  advanceSession(state.session, delta, onTarget);
  if (state.session.elapsedMs >= state.durationSeconds * 1000) {
    finishSession(false);
    return;
  }
  updateTimer();
  if (state.mode === "tracking") updateLiveStats();
  drawArena();
  state.frameId = requestAnimationFrame(frame);
}

function pauseSession(automatic = false) {
  if (state.status !== "running") return;
  state.status = "paused";
  cancelAnimationFrame(state.frameId);
  $("#arena").classList.remove("is-playing");
  $("#pause-layer").hidden = false;
  $("#pause-button").textContent = "Resume";
  state.pointerActive = false;
  state.pointer = null;
  setSessionState("PAUSED", "paused");
  if (automatic) $("#session-announcement").textContent = "Session paused because the page lost focus. Resume when ready.";
  drawArena();
}

function resumeSession() {
  if (state.status !== "paused") return;
  state.status = "running";
  state.lastFrameAt = performance.now();
  $("#arena").classList.add("is-playing");
  $("#pause-layer").hidden = true;
  $("#pause-button").textContent = "Pause";
  setSessionState("IN SESSION", "running");
  $("#session-announcement").textContent = "Session resumed.";
  state.frameId = requestAnimationFrame(frame);
}

function finishSession(early) {
  if (!state.session) return;
  window.clearInterval(state.countdownTimer);
  cancelAnimationFrame(state.frameId);
  state.status = "results";
  state.pointerActive = false;
  state.pointer = null;
  $("#arena").classList.remove("is-playing");
  $("#pause-layer").hidden = true;
  $("#countdown-layer").hidden = true;
  $("#arena-empty").hidden = true;
  $("#start-button").disabled = false;
  $("#start-button").innerHTML = '<span class="button-play" aria-hidden="true">▶</span> Start another';
  $("#pause-button").disabled = true;
  $("#end-button").disabled = true;
  setControlsDisabled(false);
  setSessionState("COMPLETE");
  $("#timer-value").textContent = "00:00";
  const results = getResults(state.session);
  const record = {
    id: state.session.id,
    createdAt: state.sessionStartAt,
    mode: state.mode,
    scenarioId: state.session.scenarioId,
    durationSeconds: state.durationSeconds,
    targetSize: state.targetSize,
    elapsedSeconds: Math.min(state.durationSeconds, results.elapsedSeconds),
    hits: results.hits,
    misses: results.misses,
    clicks: results.clicks,
    accuracy: results.accuracy,
    averageReactionMs: results.averageReactionMs,
    bestReactionMs: results.bestReactionMs,
    onTargetMs: results.onTargetMs,
    onTargetPercent: results.onTargetPercent,
    score: results.score,
    inputType: results.inputType
  };
  const saved = saveSession(record);
  renderResults(results, saved, early);
  $("#result-title").focus({ preventScroll: true });
  renderProgress();
  $("#session-announcement").textContent = early ? "Session ended early. Results are shown below." : "Session complete. Results are shown below.";
  drawArena();
}

function renderResults(results, saved, early) {
  const scenario = SCENARIO_BY_ID[state.session.scenarioId];
  $("#result-panel").hidden = false;
  $("#result-title").textContent = scenario.name + " — run summary";
  if (state.mode === "tracking") {
    $("#result-hits").textContent = (results.onTargetMs / 1000).toFixed(1) + "s";
    $("#result-accuracy").textContent = (results.onTargetPercent ?? 0) + "%";
    $("#result-reaction").textContent = results.elapsedSeconds + "s";
    $("#result-fourth").textContent = String(results.score);
    resultColumns[0].textContent = "TIME ON TARGET";
    resultColumns[1].textContent = "ON TARGET";
    resultColumns[2].textContent = "ACTIVE TIME";
    resultColumns[3].textContent = "TRACK SCORE";
  } else {
    $("#result-hits").textContent = String(results.hits);
    $("#result-accuracy").textContent = (results.accuracy ?? 0) + "%";
    $("#result-reaction").textContent = results.averageReactionMs === null ? "—" : results.averageReactionMs + "ms";
    $("#result-fourth").textContent = String(results.misses);
    resultColumns[0].textContent = "HITS";
    resultColumns[1].textContent = "ACCURACY";
    resultColumns[2].textContent = "AVG. REACTION";
    resultColumns[3].textContent = "MISSES";
  }
  $("#result-note").textContent = (early ? "Early finish. " : "") + (saved ? scenario.name + " saved privately on this device." : "This browser could not save local progress. Check its storage settings.");
  if (state.playlist) {
    const completed = state.playlistIndex + 1;
    const nextScenario = SCENARIO_BY_ID[state.playlist[state.playlistIndex + 1]];
    if (nextScenario) {
      const saveStatus = saved ? "Result saved locally. " : "This result could not be saved. ";
      $("#result-note").textContent = (early ? "Early finish. " : "") + completed + " of " + state.playlist.length + " warm-up tasks complete. " + saveStatus + "Next: " + nextScenario.name + ".";
      $("#again-button").textContent = "Next scenario";
      $("#stop-playlist").hidden = false;
      $("#start-button").disabled = true;
    } else {
      $("#result-note").textContent = "Three-skill warm-up complete. " + (saved ? "Results are saved privately on this device." : "This browser could not save local progress.");
      state.playlist = null;
      state.playlistIndex = 0;
      $("#again-button").textContent = "Run it again";
      $("#stop-playlist").hidden = true;
      $("#start-button").disabled = false;
    }
  } else {
    $("#again-button").textContent = "Run it again";
    $("#stop-playlist").hidden = true;
    $("#start-button").disabled = false;
  }
}

function formatDate(iso) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function appendHistoryRow(record) {
  const row = document.createElement("div");
  row.className = "history-row";
  const date = document.createElement("div");
  date.className = "history-date";
  const dateText = document.createElement("strong");
  dateText.textContent = formatDate(record.createdAt);
  const modeText = document.createElement("span");
  modeText.className = "history-mode";
  modeText.textContent = (SCENARIO_BY_ID[record.scenarioId]?.name || modeNames[record.mode]) + " · " + record.durationSeconds + " SEC";
  date.append(dateText, modeText);
  row.append(date);
  const values = record.mode === "tracking"
    ? [[(record.onTargetMs / 1000).toFixed(1) + "s", "ON TARGET"], [record.onTargetPercent + "%", "TRACK RATE"], [record.elapsedSeconds + "s", "TIME"]]
    : [[String(record.hits), "HITS"], [(record.accuracy ?? 0) + "%", "ACCURACY"], [record.averageReactionMs === null ? "—" : record.averageReactionMs + "ms", "AVG REACTION"]];
  values.forEach(([value, label]) => {
    const cell = document.createElement("div");
    cell.className = "history-cell";
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    cell.append(strong, span);
    row.append(cell);
  });
  $("#history-list").append(row);
}

function renderProgress() {
  const sessions = loadSessions();
  const totalHits = sessions.reduce((sum, record) => sum + record.hits, 0);
  const clickRecords = sessions.filter((record) => record.accuracy !== null);
  const bestAccuracy = clickRecords.length ? Math.max(...clickRecords.map((record) => record.accuracy)) : null;
  const totalSeconds = sessions.reduce((sum, record) => sum + record.elapsedSeconds, 0);
  const count = String(sessions.length).padStart(2, "0");
  $("#header-session-count").textContent = count;
  $("#progress-session-count").textContent = count;
  $("#progress-total-hits").textContent = String(totalHits);
  $("#progress-best-accuracy").textContent = bestAccuracy === null ? "—" : bestAccuracy + "%";
  $("#progress-time").textContent = totalSeconds < 60 ? totalSeconds + " sec" : (totalSeconds / 60).toFixed(totalSeconds % 60 === 0 ? 0 : 1) + " min";
  $("#history-count").textContent = sessions.length + (sessions.length === 1 ? " RECORD" : " RECORDS");
  const history = $("#history-list");
  history.replaceChildren();
  sessions.slice(0, 10).forEach(appendHistoryRow);
  renderTrends(sessions);
  renderScenarioList();
  $("#history-empty").hidden = sessions.length > 0;
  history.hidden = sessions.length === 0;
}

function renderTrends(sessions) {
  const chart = $("#trend-chart");
  chart.replaceChildren();
  let hasSessions = false;
  const definitions = SCENARIOS.map((scenario) => ({
    ...scenario,
    metric: scenario.mode === "tracking" ? "On-target rate (%)" : "Accuracy (%)",
    value: scenario.mode === "tracking" ? (record) => record.onTargetPercent ?? 0 : (record) => record.accuracy ?? 0,
    maximum: 100
  }));
  for (const definition of definitions) {
    const recent = sessions.filter((record) => record.scenarioId === definition.id && record.durationSeconds === definition.durationSeconds && record.targetSize === definition.targetSize).slice(0, 10).reverse();
    if (!recent.length) continue;
    hasSessions = true;
    const modeSection = document.createElement("section");
    modeSection.className = "trend-mode";
    const info = document.createElement("div");
    info.className = "trend-info";
    const heading = document.createElement("h3");
    heading.textContent = definition.name;
    const metric = document.createElement("p");
    metric.textContent = definition.metric + " · " + definition.durationSeconds + " sec / " + definition.targetSize;
    info.append(heading, metric);
    modeSection.append(info);
    const observedMaximum = definition.maximum ?? Math.max(1, ...recent.map(definition.value));
    const summary = recent.map((record) => {
      const date = formatDate(record.createdAt);
      return date + ": " + definition.value(record) + "% " + (definition.mode === "tracking" ? "on target" : "accuracy");
    }).join("; ");
    const bars = document.createElement("div");
    bars.className = "trend-bars";
    bars.setAttribute("role", "img");
    bars.setAttribute("aria-label", definition.name + ", oldest to newest: " + summary);
    recent.forEach((record) => {
      const value = definition.value(record);
      const level = value <= 0 ? 0 : Math.min(10, Math.ceil((value / observedMaximum) * 10));
      const entry = document.createElement("div");
      entry.className = "trend-entry";
      entry.setAttribute("aria-hidden", "true");
      const valueLabel = document.createElement("span");
      valueLabel.className = "trend-value";
      valueLabel.textContent = String(value);
      const bar = document.createElement("span");
      bar.className = "trend-bar trend-level-" + level;
      const date = document.createElement("span");
      date.className = "trend-date";
      date.textContent = new Intl.DateTimeFormat(undefined, { day: "2-digit" }).format(new Date(record.createdAt));
      entry.append(valueLabel, bar, date);
      bars.append(entry);
    });
    modeSection.append(bars);
    chart.append(modeSection);
  }
  $("#trend-empty").hidden = hasSessions;
  chart.hidden = !hasSessions;
}

function setView(name) {
  if (name !== "training" && state.status === "running") {
    pauseSession();
    $("#session-announcement").textContent = "Session paused while you viewed another page.";
  } else if (name !== "training" && state.status === "countdown") {
    cancelCountdownForFocusLoss();
  }
  document.querySelectorAll(".view").forEach((view) => { view.hidden = view.id !== "view-" + name; });
  document.querySelectorAll("[data-view-button]").forEach((button) => {
    const selected = button.dataset.viewButton === name;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  if (name === "progress") renderProgress();
  if (name === "training") window.setTimeout(resizeCanvas, 0);
  const heading = $("#view-" + name + " h1");
  if (heading) heading.focus({ preventScroll: true });
}

function announceData(message, isError = false) {
  const status = $("#data-status");
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function dismissResultForSetupChange() {
  $("#result-panel").hidden = true;
  if (state.status === "results") {
    state.status = "idle";
    state.session = null;
    $("#start-button").innerHTML = '<span class="button-play" aria-hidden="true">▶</span> Start session';
  }
}

function cancelCountdownForFocusLoss() {
  if (state.status !== "countdown") return;
  window.clearInterval(state.countdownTimer);
  state.countdownTimer = 0;
  state.status = "idle";
  state.session = null;
  $("#countdown-layer").hidden = true;
  $("#arena-empty").hidden = false;
  $("#start-button").disabled = false;
  $("#start-button").innerHTML = '<span class="button-play" aria-hidden="true">▶</span> Start session';
  $("#pause-button").disabled = true;
  $("#end-button").disabled = true;
  setControlsDisabled(false);
  setSessionState("READY");
  updateTimer();
  $("#session-announcement").textContent = "Countdown cancelled because the page lost focus. Start again when you are ready.";
}

function handleFocusLoss() {
  if (state.status === "running") pauseSession(true);
  else if (state.status === "countdown") cancelCountdownForFocusLoss();
}

function exportProgress() {
  const sessions = loadSessions();
  const content = makeBackup(sessions);
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "range-os-progress.json";
  link.click();
  URL.revokeObjectURL(url);
  announceData("Exported " + sessions.length + " saved sessions.");
}

async function handleImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (file.size > 1_000_000) {
    announceData("Backup files must be smaller than 1 MB.", true);
    event.target.value = "";
    return;
  }
  try {
    const result = importBackup(await file.text());
    announceData(result.saved ? "Imported " + result.imported + " validated sessions." : "The browser could not save imported progress.", !result.saved);
    renderProgress();
  } catch (error) {
    announceData(error.message || "That backup could not be imported.", true);
  } finally {
    event.target.value = "";
  }
}

document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
$("#scenario-search").addEventListener("input", renderScenarioList);
$("#scenario-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-scenario]");
  if (button) setScenario(button.dataset.scenario, true);
});
$("#start-playlist").addEventListener("click", startWarmupPlaylist);
$("#stop-playlist").addEventListener("click", stopPlaylist);
document.querySelectorAll("[data-duration]").forEach((button) => button.addEventListener("click", () => {
  if (state.status === "running" || state.status === "paused" || state.status === "countdown") return;
  clearPlaylist();
  state.durationSeconds = Number(button.dataset.duration);
  dismissResultForSetupChange();
  document.querySelectorAll("[data-duration]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  updateTimer();
  renderScenarioList();
}));
$("#target-size").addEventListener("change", (event) => {
  clearPlaylist();
  state.targetSize = event.target.value;
  dismissResultForSetupChange();
  if (state.status === "idle" || state.status === "results") createTargets();
  renderScenarioList();
  drawArena();
});
$("#start-button").addEventListener("click", () => {
  if (state.status === "paused") resumeSession();
  else if (state.status === "idle" || state.status === "results") continuePlaylist();
});
$("#again-button").addEventListener("click", continuePlaylist);
$("#pause-button").addEventListener("click", () => state.status === "paused" ? resumeSession() : pauseSession());
$("#end-button").addEventListener("click", () => finishSession(true));
$("#arena").addEventListener("pointerdown", handleArenaDown);
$("#arena").addEventListener("pointermove", handleArenaMove);
$("#arena").addEventListener("pointerup", handleArenaUp);
$("#arena").addEventListener("pointercancel", handleArenaUp);
$("#arena").addEventListener("pointerleave", handleArenaLeave);
$("#arena").addEventListener("keydown", handleCanvasKey);
document.querySelectorAll("[data-view-button]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.viewButton)));
$("[data-nav-home]").addEventListener("click", (event) => { event.preventDefault(); setView("training"); });
document.querySelectorAll("[data-go-train]").forEach((button) => button.addEventListener("click", () => setView("training")));
$("#export-button").addEventListener("click", exportProgress);
$("#import-file").addEventListener("change", handleImport);
$("#clear-button").addEventListener("click", () => {
  if (!window.confirm("Delete all progress saved in this browser? This cannot be undone unless you have an export.")) return;
  const cleared = clearSessions();
  announceData(cleared ? "All saved progress was deleted from this browser." : "The browser could not clear its saved progress.", !cleared);
  renderProgress();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.status === "running") { event.preventDefault(); pauseSession(); }
  else if (event.key === "Escape" && state.status === "paused") { event.preventDefault(); resumeSession(); }
  else if (event.key === "Escape" && state.status === "countdown") { event.preventDefault(); cancelCountdownForFocusLoss(); }
});
window.addEventListener("blur", handleFocusLoss);
document.addEventListener("visibilitychange", () => { if (document.hidden) handleFocusLoss(); });
window.addEventListener("resize", resizeCanvas);

if ("ResizeObserver" in window) new ResizeObserver(resizeCanvas).observe(arenaFrame);
updateModeView();
updateTimer();
renderScenarioList();
renderProgress();
createTargets();
resizeCanvas();
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("./sw.js").catch(() => { /* The trainer remains usable without offline caching. */ });
}
