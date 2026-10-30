export const STORAGE_KEY = "range-os.progress.v1";
export const STORAGE_SCHEMA = 1;
export const MAX_SESSIONS = 2000;
export const MAX_IMPORT_BYTES = 1_000_000;

const VALID_MODES = new Set(["flick", "switch", "tracking"]);
const VALID_INPUTS = new Set(["mouse", "touch", "pen", "keyboard", "mixed", "unknown"]);
const VALID_DURATIONS = new Set([30, 60, 90]);

export function validateRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  if (typeof record.id !== "string" || record.id.length < 1 || record.id.length > 80) return false;
  if (!VALID_MODES.has(record.mode)) return false;
  if (typeof record.createdAt !== "string" || !Number.isFinite(Date.parse(record.createdAt))) return false;
  if (!VALID_DURATIONS.has(record.durationSeconds)) return false;
  if (!Number.isInteger(record.elapsedSeconds) || record.elapsedSeconds < 0 || record.elapsedSeconds > record.durationSeconds) return false;
  if (!["hits", "misses", "clicks", "score"].every((key) => Number.isInteger(record[key]) && record[key] >= 0 && record[key] <= 100000)) return false;
  if (record.hits + record.misses !== record.clicks) return false;
  if (record.accuracy !== null && (!Number.isFinite(record.accuracy) || record.accuracy < 0 || record.accuracy > 100)) return false;
  if (record.averageReactionMs !== null && (!Number.isFinite(record.averageReactionMs) || record.averageReactionMs < 0 || record.averageReactionMs > 60000)) return false;
  if (record.bestReactionMs !== null && (!Number.isFinite(record.bestReactionMs) || record.bestReactionMs < 0 || record.bestReactionMs > 60000)) return false;
  if (record.onTargetPercent !== null && (!Number.isFinite(record.onTargetPercent) || record.onTargetPercent < 0 || record.onTargetPercent > 100)) return false;
  if (!Number.isFinite(record.onTargetMs) || record.onTargetMs < 0 || record.onTargetMs > record.elapsedSeconds * 1000 + 1000) return false;
  if (!VALID_INPUTS.has(record.inputType)) return false;
  return true;
}

export function sanitizeRecord(record) {
  if (!validateRecord(record)) throw new TypeError("This backup contains an invalid session record.");
  return {
    id: record.id,
    createdAt: new Date(record.createdAt).toISOString(),
    mode: record.mode,
    durationSeconds: record.durationSeconds,
    elapsedSeconds: record.elapsedSeconds,
    hits: record.hits,
    misses: record.misses,
    clicks: record.clicks,
    accuracy: record.accuracy,
    averageReactionMs: record.averageReactionMs,
    bestReactionMs: record.bestReactionMs,
    onTargetMs: Math.round(record.onTargetMs),
    onTargetPercent: record.onTargetPercent,
    score: record.score,
    inputType: record.inputType
  };
}

export function parseBackup(text) {
  if (typeof text !== "string") throw new TypeError("Choose a JSON backup file.");
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new RangeError("Backup files must be smaller than 1 MB.");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TypeError("That file is not valid JSON.");
  }
  if (!parsed || parsed.schemaVersion !== STORAGE_SCHEMA || !Array.isArray(parsed.sessions)) {
    throw new TypeError("This backup format is not supported.");
  }
  if (parsed.sessions.length > MAX_SESSIONS) throw new RangeError("This backup contains too many sessions.");
  return parsed.sessions.map(sanitizeRecord);
}

export function makeBackup(sessions, exportedAt = new Date().toISOString()) {
  return JSON.stringify({ schemaVersion: STORAGE_SCHEMA, exportedAt, sessions: sessions.map(sanitizeRecord) }, null, 2);
}

function getLocalStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadSessions() {
  const storage = getLocalStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "{}");
    if (parsed.schemaVersion !== STORAGE_SCHEMA || !Array.isArray(parsed.sessions)) return [];
    return parsed.sessions.filter(validateRecord).slice(0, MAX_SESSIONS).map(sanitizeRecord);
  } catch {
    return [];
  }
}

function writeSessions(sessions) {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: STORAGE_SCHEMA, sessions: sessions.slice(0, MAX_SESSIONS) }));
    return true;
  } catch {
    return false;
  }
}

export function saveSession(record) {
  const safeRecord = sanitizeRecord(record);
  const current = loadSessions().filter((item) => item.id !== safeRecord.id);
  current.unshift(safeRecord);
  return writeSessions(current);
}

export function importBackup(text) {
  const imported = parseBackup(text);
  const byId = new Map(loadSessions().map((record) => [record.id, record]));
  for (const record of imported) byId.set(record.id, record);
  const merged = [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { imported: imported.length, saved: writeSessions(merged) };
}

export function clearSessions() {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
