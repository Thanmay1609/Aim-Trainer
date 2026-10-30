# Acceptance and verification checklist

## Product

- [x] Three training modes are available.
- [x] Nine original scenario presets cover precision, switching, and tracking; scenario search, local personal bests, and per-scenario trends are included.
- [x] Switching has three- and six-point layouts; tracking has sweep and figure-eight paths.
- [x] Three-skill warm-up advances through one preset from each category and can be stopped between tasks.
- [x] Saved sessions retain scenario and target-size metadata; legacy backups receive safe defaults.
- [x] Sessions support 30, 60, and 90 seconds and three target sizes.
- [x] Session flow has countdown, pause, resume, early end, and results.
- [x] Progress is local with export, validated import, and deletion controls.
- [x] Static PWA shell and offline fallback are included.
- [x] Keyboard aiming is available in addition to mouse and touch.
- [x] GitHub Pages is configured to publish the static site through Actions.
- [x] Initial Pages workflow completed; live page, stylesheet, manifest, service worker, modules, and icon returned HTTP 200 on 30 October 2026.

## Verification performed

- [x] Core, storage, and static-shell tests passed earlier in implementation (12 tests). Node syntax checks passed after the scenario-library changes; the full test suite was not rerun after these changes.
- [ ] Local HTTP launch and browser interaction review. The Python server started, but this sandbox denied local socket access and the Windows browser helper stopped before navigating to localhost.
- [ ] Mouse / touch / keyboard manual matrix (requires interactive browser/device checks).
- [ ] Offline reload and service-worker update behavior (requires browser with service-worker support).
- [ ] Real-device frame pacing and screen-reader review (not verified in the current local environment).

## Known limits

- No hands-on competitor usability test was performed; the market audit uses public product and storefront material.
- Scores are local client-side records and are not tamper-proof.
- Local sessions do not sync between devices.
- Host-specific response headers are not configurable through the static project and need a host that supports them.
