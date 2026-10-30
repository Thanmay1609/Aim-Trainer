# Range OS: Codex loop engineering prompt

Use this as the starting prompt for a longer Codex engineering cycle. The live project already exists: inspect the current code and deployed site before proposing a rewrite.

## Start the goal

Paste this into a Codex thread opened in the repository:

```text
/goal Improve and maintain Range OS as a polished, free-to-use browser aim trainer at https://thanmay1609.github.io/Aim-Trainer/, verified by the current app, relevant automated checks, responsive visual inspection, accessibility review, and a successful GitHub Pages deployment. Preserve the current working features and local-first privacy. Work in small evidence-backed iterations: inspect the repository and live site, identify the highest-impact unmet acceptance criterion, make the smallest sound change, run the checks that apply, and continue until all achievable criteria are met. Use parallel specialist agents for independent game-engine, security/privacy, and visual/accessibility reviews when subagents are available; resolve their findings in the main branch and verify the combined result. If a browser, device, permission, account, or external dependency blocks verification, report the exact blocker and leave that criterion honestly unverified. Do not claim to have audited every aim trainer on the internet; extend the dated, source-linked review of representative products and label its scope and uncertainty. Stop only when the acceptance checklist is satisfied or a specific external blocker requires the user.
```

Codex Goals are available in Codex builds that support the feature (official guidance lists version 0.128.0 as the starting point). Check `codex --version` if `/goal` is not recognized. Goal lifecycle commands include `/goal`, `/goal pause`, `/goal resume`, and `/goal clear`. See [OpenAI's Goals guide](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex).

## Project brief to keep in the working context

**Product:** Range OS is a browser-first aim practice site. Its first release has three distinct Canvas 2D drills—flick/precision, target switching, and tracking—with mouse, touch, and keyboard input. It records hits, misses, accuracy, reaction time, and time-on-target as applicable. People can practice from the public site without installing a client or creating an account.

**Progress and privacy:** Results stay in browser storage. People can inspect per-mode trends, export/import a validated backup, or delete local records. Hosting the site worldwide does not sync personal progress between devices. Do not add accounts, analytics, third-party scripts, or cloud collection without an explicit product and privacy decision.

**Research:** `docs/market-audit.md` compares five representative products from publicly available product and storefront material. Treat it as a bounded snapshot, not an exhaustive internet-wide audit or hands-on usability study. Add sources, access dates, concrete observations, user impact, and confidence to future audit entries. Turn only evidence-supported gaps into product work.

**Engineering:** Keep the app static and dependency-light. Maintain responsive layouts, accessible controls and announcements, reduced-motion support, safe local-data import/export, bounded frame-time accounting, offline app-shell caching, and the restrictive same-origin content policy. Preserve GitHub Pages deployment through `.github/workflows/deploy-pages.yml`.

## Visual direction

Build on the existing visual system instead of inventing a new one every iteration:

- Graphite range: `#101516` background and `#182021` panels.
- Warm near-white copy with muted gray-green support text.
- Lime `#d3ff62` for active actions and key results; cyan `#86d8dc` for structure and target detail.
- A clear practice-console hierarchy: compact header, mode choice, large calm arena, short session controls, legible results, and progress charts.
- Use original Canvas/CSS geometry and SVG assets. Avoid copying competitor artwork, names, sounds, or distinctive layouts.
- Keep motion purposeful, targets distinguishable without color alone, and small-screen controls readable and thumb-friendly.

```text
┌────────────────────────── RANGE OS ──────────────────────────┐
│ Train       Progress       About          Saved on this device│
├─────────────────────┬────────────────────────────────────────┤
│ CHOOSE A DRILL      │  ACTIVE MODE       MOUSE / TOUCH / KEYS│
│ ○ Flick / precision │ ┌────────────────────────────────────┐ │
│ ○ Target switching │ │                                    │ │
│ ○ Tracking         │ │       CANVAS PRACTICE RANGE         │ │
│                    │ │        target + aim feedback        │ │
│ 30 / 60 / 90 sec   │ └────────────────────────────────────┘ │
│ Target size        │   timer       pause / resume      end   │
│                    │   hits   accuracy   reaction   misses  │
└─────────────────────┴────────────────────────────────────────┘
Progress view: summary → separate trend for each drill → recent sessions → data export/delete
```

## Specialist review briefs

Delegate only independent work that can be merged and checked by the lead agent:

1. **Game-engine reviewer:** inspect pointer boundaries, timing, target spawning, keyboard/touch behavior, scoring invariants, pause/resume, and frame pacing. Return reproducible findings with severity and affected files.
2. **Security/privacy reviewer:** trace browser data flows, service-worker scope/cache behavior, import validation, content policy, accessibility/privacy implications, and hosting risks. Do not add tracking or transmit scores.
3. **Visual/accessibility reviewer:** inspect 320 px, tablet, and desktop layouts; keyboard focus; contrast; non-color cues; screen-reader labels; and canvas feedback. Return specific issues with locations and expected user impact.
4. **3D design specialist:** review a proposed 3D feature or asset only when the product case is clear. Keep the current Canvas 2D MVP lean; describe performance, loading, mobile, and accessible fallbacks before recommending a 3D runtime or model pipeline.

The lead Codex agent owns integration, tests, acceptance status, commit quality, and deployment verification. Treat agent output as review evidence, not as proof until checked against the source and app.

## Completion checklist

- Three modes remain playable with mouse, touch, and keyboard; scoring stays mode-specific and honest.
- Timer, pause, resume, early finish, results, progress, backup import/export, and deletion all work.
- Layout and controls remain usable from 320 px through desktop widths; reduced motion and keyboard-only use remain supported.
- New input and data paths receive focused tests; run the relevant existing checks and record their actual output.
- Security and product review findings are resolved or explicitly recorded with a reason and owner.
- Review the app visually at mobile and desktop sizes; inspect browser console and network behavior when a browser is available.
- The Pages workflow completes and the live URL serves the current app assets.
- Update `docs/acceptance-checklist.md`, architecture/security docs, and the market audit when changes make them stale.
- Report what changed, evidence gathered, remaining limits, and the deployed commit. Do not mark incomplete manual/device checks as passed.
