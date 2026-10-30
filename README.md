# Range OS

Range OS is a small, static aim-training web app with nine curated scenarios across three core skills. It runs without an account, backend, third-party scripts, remote fonts, or analytics. Training history is stored in this browser and can be exported as JSON.

## Run locally

From this directory, start Python’s built-in static server:

    python -m http.server 4173

Open http://localhost:4173. HTTPS or localhost is required for service-worker installation. The app still works without service-worker support.

## Verify the game logic and data handling

With Node.js 20 or later:

    node --test tests/*.test.mjs

The tests use Node’s built-in test runner; no package install is required.

## Training modes

- **Flick / precision:** hit one static target at a time. Hits, misses, click accuracy, and reaction time are recorded.
- **Target switching:** hit highlighted targets in a three- or six-point sequence. Other targets are visible but do not count until active.
- **Tracking:** follow a moving target on a smooth sweep or figure-eight path. The app samples active time on target and reports track rate.

The scenario library includes three original presets for each skill. Search the current skill's list, choose a target size and duration, then start immediately. Scenario cards show a local personal best. The three-task warm-up chains one task from each skill. Progress charts keep preset-setting results separate by scenario; custom-size or custom-duration runs remain in recent history.

Mouse and touch use Pointer Events. Keyboard players can focus the arena, move with the arrow keys, and press Space in clicking drills. Shift plus an arrow moves the keyboard crosshair farther. Escape pauses or resumes. The trainer does not request pointer lock.

## Progress and privacy

Session history stays in local browser storage. Progress shows a separate recent trend for each scenario, so unlike tasks are not combined. History does not sync to other devices. Use Progress to export, import, or delete saved sessions. Browser storage may be cleared by private-browsing settings, device cleanup, or the user. Local scores are editable and are not suitable for authoritative leaderboards.

The service worker caches only the static same-origin app shell. The app makes no analytics or external requests.

## Deployment

**Live site:** [Range OS](https://thanmay1609.github.io/Aim-Trainer/)

The app includes a restrictive Content Security Policy and referrer policy in its HTML. For hosts that support response-header configuration, also set `X-Content-Type-Options: nosniff` and a `Permissions-Policy` that disables unused browser features. HTML policies cannot replace every response header; review `docs/security-and-privacy.md` before changing hosts. Hosting cost and free-tier limits depend on the selected provider and may change.

The repository is configured to publish through GitHub Pages. Pushes to `main` publish the static app files automatically. The market audit and project documentation stay in the source repository and are not included in the public site artifact.

## Project notes

- `docs/market-audit.md` records the five-product public-source review and its coverage limits.
- `docs/product-and-architecture.md` describes the app structure and acceptance surface.
- `docs/security-and-privacy.md` covers client-side data handling and deployment headers.
- `docs/acceptance-checklist.md` tracks what has and has not been verified.
- `docs/loop-engineering-prompt.md` gives a reusable Codex `/goal` brief and specialist review plan.
