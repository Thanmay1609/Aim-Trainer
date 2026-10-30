# Security and privacy notes

## Current data flow

The app has no account, application API, analytics, or third-party requests. A hosted copy necessarily requests its static assets from its hosting origin; the service worker also fetches same-origin assets for the app shell. Session results stay in the browser’s local storage under a versioned key. They are not synced, encrypted, or treated as authoritative; users can edit them and browser cleanup may remove them. Hosting providers may keep their own request logs under their policies.

## Import and export

- Exports contain only session results and a schema version; they contain no account identifiers or secrets.
- Imports are capped at 1 MB and 2,000 sessions. Each record is validated for a known mode, valid date, supported duration and input type, integer counters, consistent hit/miss totals, and bounded metrics.
- Unknown fields are discarded during sanitization. Imported strings are rendered with `textContent`, never inserted as HTML.
- Failed or unavailable browser storage is reported to the user rather than presented as a successful save.

## Browser interaction

- The app does not request pointer lock. Escape and visible pause/end controls are available during play.
- The service worker caches only the same-origin static app shell in its own named cache. It does not cache progress, imports, or arbitrary cross-origin URLs, and it does not search or delete unrelated same-origin caches.
- No analytics, third-party scripts, embedded content, remote fonts, camera, microphone, or geolocation are used.

## Deployment checklist

Serve over HTTPS. The document includes a restrictive Content Security Policy and referrer policy. A static HTML meta policy cannot replace every security header, so use a host that supports response-header configuration for the remaining controls:

- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; form-action 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

Review host-specific routing and cache headers before enabling public deployment. Keep the service-worker cache versioned when assets change and add the previous cache name to the explicit cleanup list.

## Future sync

Adding accounts or cloud progress changes the threat model. Before implementing it, define consent, retention, account recovery, deletion, transport and storage protection, rate limits, server-side score validation, and abuse handling. Re-run security and privacy review before enabling it.
