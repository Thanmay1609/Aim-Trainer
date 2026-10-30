# Acceptance and verification checklist

## Product

- [x] Three training modes are available.
- [x] Sessions support 30, 60, and 90 seconds and three target sizes.
- [x] Session flow has countdown, pause, resume, early end, and results.
- [x] Progress is local with export, validated import, and deletion controls.
- [x] Static PWA shell and offline fallback are included.
- [x] Keyboard aiming is available in addition to mouse and touch.

## Verification performed

- [x] Core, storage, and static-shell tests passed earlier in implementation (12 tests). Final app module syntax checks also passed after the accessibility and trend-chart changes; the full test suite was not rerun after those last UI updates.
- [ ] Local HTTP launch and browser interaction review. The Python server started, but this sandbox denied local socket access and the Windows browser helper stopped before navigating to localhost.
- [ ] Mouse / touch / keyboard manual matrix (requires interactive browser/device checks).
- [ ] Offline reload and service-worker update behavior (requires browser with service-worker support).
- [ ] Real-device frame pacing and screen-reader review (not verified in the current local environment).

## Known limits

- No hands-on competitor usability test was performed; the market audit uses public product and storefront material.
- Scores are local client-side records and are not tamper-proof.
- Local sessions do not sync between devices.
- Public deployment and host-specific security headers are not configured by this static project.
