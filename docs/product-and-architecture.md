# Product and architecture

## Product definition

Range OS is a free, browser-first practice tool with three core skills and nine curated scenarios. It reduces setup, makes each metric understandable, and keeps personal history local by default. It makes no claim that a particular score guarantees performance in another game.

The UI presents one central canvas range, a searchable scenario library filtered by skill, local personal-best marks, simple length and target-size controls, session feedback, and a separate history view. The 2D arena uses layered reticles and restrained perspective lines to suggest a practice range without requiring 3D assets or a WebGL renderer.

## User journey

1. Select Flick / precision, Target switching, or Tracking.
2. Choose a scenario preset, then adjust its 30, 60, or 90 second length and target size if desired.
3. Start a short countdown and practice with mouse, touch, or keyboard.
4. Review hits, misses, reaction time, or tracking time and rate. The optional warm-up links one preset from each skill in a short sequence.
5. Compare prior sessions in per-scenario trends and the recent-session list, or export a portable JSON backup.

## System map

    Player input -> accessible controls -> Canvas game loop -> scoring -> local session history
      Scenario preset -> target pattern/count       |                            |
                                                     +-> results and local PBs    +-> JSON export/import
    Static app shell -> service worker cache (same-origin assets only)

The client is deliberately self-contained. There is no account, remote database, analytics, or public leaderboard. Any future cross-device sync needs an explicit consent and privacy design, authentication, server-side validation, and a fresh security review.

## Game loop and scoring

- Rendering uses `requestAnimationFrame`; the timer and elapsed session time use `performance.now()` deltas, not a frame-count score.
- A hidden tab or window blur pauses the session so the user does not lose practice time while away.
- The canvas backing store scales to device-pixel ratio. Input coordinates are normalized against the visible canvas rectangle so resizing does not invalidate target positions.
- Click drills count each pointer or keyboard activation as one attempt. A hit is one activation inside the active target. Accuracy is hits divided by all attempts. A wrong click is a miss; targets do not silently expire.
- Scenario presets identify the target count or movement path. Three-point and six-point switching use distinct target layouts; tracking offers sweep and figure-eight paths. Saved results include the scenario and target size.
- Reaction time measures from the active target’s appearance to the first hit.
- Tracking measures sampled active time within the moving target’s hit radius. Track rate is sampled on-target time divided by active session time. Frame gaps are capped at 100 ms for both values so a long frame does not count differently in the numerator and denominator. This is an approximate training measure, not a scientific assessment.
- Touch targets use a larger minimum radius on narrow layouts. Mouse, touch, pen, keyboard, or mixed input is recorded so sessions with different input conditions are identifiable.

## Architecture diagram

    ┌─────────────────────┐
    │ HTML controls + UI  │───────┐
    └─────────────────────┘       │
                                   v
    ┌─────────────────────┐   ┌────────────────────┐
    │ Pointer / keyboard  │──>│ Game state + Canvas│
    └─────────────────────┘   └──────────┬─────────┘
                                         v
                                  ┌──────────────┐
                                  │ Scoring core │
                                  └──────┬───────┘
                                         v
    ┌──────────────────────┐     ┌──────────────┐
    │ Backup JSON validate │<───>│ Local storage│
    └──────────────────────┘     └──────────────┘

## Accessibility and visual design

- Native buttons and select controls have visible focus styles and large touch targets.
- Progress charts include accessible text summaries; all session metrics remain available on narrow screens.
- The JSON import control stays keyboard reachable and has a visible focus indicator.
- Instructions and results remain outside the canvas; essential actions do not depend on hover.
- The keyboard crosshair moves with arrow keys and scores with Space. Tracking can be followed with keyboard, mouse, or held touch.
- The target has ring, center, and tick marks; meaning does not rely only on color.
- Reduced-motion preferences lower the tracking target’s travel speed. Decorative arena lines remain static.
- The design uses a dark charcoal range, warm text, a lime action color, and a cool cyan structural color. No remote fonts or images are needed.

## Acceptance criteria

- Three modes start, pause, resume, and complete; early finish is explicit.
- Click-mode metrics distinguish attempts, hits, misses, accuracy, and reaction time. Tracking reports time on target and sampled track rate.
- Progress reloads from the same browser; JSON backups are size- and schema-validated before import; users can delete local history.
- The searchable library offers three original scenarios for each core skill; local personal bests and charts use matching default scenario settings.
- The app is usable at 320px and wider, with mouse, touch, and keyboard controls.
- The static app shell can load from cache after a prior successful visit when the browser supports service workers.
- No account, remote scoring endpoint, analytics, remote assets, or 3D runtime is required for the MVP.
