# RhythmCoach Privacy Notes

_Last updated: 2026-08-08_

RhythmCoach is designed as a local-first rehearsal tool.

## Data stored locally

The application may store the following information in the current browser:

- Scripts and saved draft materials.
- Rehearsal settings.
- Session metrics and comparison history.
- Audio recordings created during rehearsals.

This data is stored through browser storage such as IndexedDB. RhythmCoach does not require an account and does not automatically upload microphone audio to a server.

## Microphone access

Microphone permission is requested only when a rehearsal needs speech activity analysis or recording. Audio is used in the browser for voice activity detection and recording. RhythmCoach does not perform speech-content recognition in version 1.0.1.

## Usage analytics

The hosted Web/PWA can load Cloudflare Web Analytics when the production build supplies `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN`. The analytics surface is limited to aggregate traffic and Web Vitals. If the token is not configured, RhythmCoach does not load an analytics beacon.

RhythmCoach does not send scripts, saved drafts, session notes, session metrics, microphone audio, locally stored recordings, or account state as custom analytics events. Analytics is separate from the local rehearsal-data workflow.

Users may also block the analytics beacon through browser privacy controls, tracking protection, content blockers, or other browser settings.

## Data deletion and retention

Browser storage remains under the user's control. Removing site data, using private-browsing storage, or browser cleanup may delete scripts, recordings, and rehearsal history. Important recordings should be downloaded before clearing browser data.

Deleting local site data does not necessarily remove aggregate analytics records already processed by the analytics provider when Web Analytics is enabled.

## PWA and offline cache

The installed web app may cache application files so the interface can reopen after a previous successful visit. The service worker does not create an external user profile or transmit rehearsal data.

When the application is online and Web Analytics is configured, the Cloudflare beacon may load independently of the PWA cache.

## External links

RhythmCoach may include links to third-party websites, such as the project repository or a voluntary support page. Those sites operate under their own privacy policies.

## Scope

These notes describe the stable version 1.0.1 implementation in this repository. If future versions add optional cloud synchronization, external speech services, custom behavioral analytics, or additional analytics providers, those features must be disclosed separately.
