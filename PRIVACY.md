# RhythmCoach Privacy Notes

_Last updated: 2026-08-08_

RhythmCoach is designed as a local-first rehearsal tool.

## Data stored locally

The application may store the following information in the current browser:

- Scripts and personal-library materials.
- Rehearsal settings.
- Session metrics and comparison history.
- Audio recordings created during rehearsals.

Core rehearsal does not require an account. Browser storage remains the default home for rehearsal data.

## Optional personal-library cloud sync

RhythmCoach Pro can synchronize **text materials that the signed-in user explicitly saves to the Personal Library**. This includes the material title, script text, optional practice tip, and optional delivery markup. The cloud copy is stored in the shared Supabase project under user-scoped Row Level Security and is available only to the same signed-in user.

Local personal-library saving remains available without Pro. Cloud synchronization is an additional membership benefit, not a requirement for rehearsal.

**Audio recordings are never uploaded or stored online by RhythmCoach.** Recordings remain in the current browser. Pro membership only unlocks downloading those locally stored recording files; it does not change where the audio is stored.

## Microphone access

Microphone permission is requested only when a rehearsal needs speech activity analysis or recording. Audio is used in the browser for voice activity detection and recording. RhythmCoach does not perform speech-content recognition in version 1.0.1.

## Account and membership data

When the user signs in, RhythmCoach may read or update the shared Hao Apps profile, product-account metadata, active entitlements, and the user's own admin role where applicable. Authorization is based on server-managed data and Supabase Row Level Security, not user-editable profile metadata.

RhythmCoach Pro currently unlocks:

- Downloading locally stored recording files.
- Online storage and cross-device synchronization of Personal Library text materials.

Core rehearsal, local recording, and local material saving remain available without Pro.

## Usage analytics

The hosted Web/PWA can load Cloudflare Web Analytics when the production build supplies `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN`. The analytics surface is limited to aggregate traffic and Web Vitals. If the token is not configured, RhythmCoach does not load an analytics beacon.

RhythmCoach does not send scripts, personal-library text, session notes, session metrics, microphone audio, locally stored recordings, or account state as custom analytics events. Analytics is separate from the rehearsal-data workflow.

Users may also block the analytics beacon through browser privacy controls, tracking protection, content blockers, or other browser settings.

## Data deletion and retention

Browser storage remains under the user's control. Removing site data, using private-browsing storage, or browser cleanup may delete local scripts, recordings, and rehearsal history. Important recordings should be downloaded before clearing browser data.

Deleting a Personal Library item while cloud sync is active removes that user's matching cloud item. Deleting local browser data alone does not automatically delete a cloud-synchronized Personal Library item.

Deleting local site data does not necessarily remove aggregate analytics records already processed by the analytics provider when Web Analytics is enabled.

## PWA and offline cache

The installed web app may cache application files so the interface can reopen after a previous successful visit. The service worker does not upload rehearsal audio or create an external audio archive.

When the application is online and Web Analytics is configured, the Cloudflare beacon may load independently of the PWA cache.

## External links

RhythmCoach may include links to third-party websites, such as the project repository or membership billing pages. Those sites operate under their own privacy policies.

## Scope

These notes describe the current RhythmCoach implementation in this repository. Any future feature that sends microphone audio, recordings, or speech content to an external service would require a separate explicit product decision and corresponding privacy disclosure.
