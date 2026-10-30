import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");

test("app shell references only local assets that exist", () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (ref.startsWith("#")) continue;
    assert.equal(/^https?:/i.test(ref), false, "external app asset: " + ref);
    assert.equal(existsSync(resolve(root, ref)), true, "missing local asset: " + ref);
  }
});

test("main page has unique ids and accessible training controls", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "duplicate HTML id");
  assert.match(html, /<canvas[^>]+tabindex="0"[^>]+aria-label=/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /data-mode="flick"/);
  assert.match(html, /data-mode="switch"/);
  assert.match(html, /data-mode="tracking"/);
  assert.equal(html.includes("<script>"), false, "inline script should remain absent");
  assert.equal(html.includes("style="), false, "inline style should remain absent");
});

test("offline shell lists the same required local modules as the project", () => {
  const worker = readFileSync(resolve(root, "sw.js"), "utf8");
  for (const path of ["./index.html", "./styles.css", "./src/app.mjs", "./src/core.mjs", "./src/storage.mjs", "./manifest.webmanifest", "./assets/icon.svg"]) {
    assert.equal(worker.includes(path), true, "service worker does not cache " + basename(path));
    assert.equal(existsSync(resolve(root, path.slice(2))), true, "missing offline asset " + path);
  }
});
