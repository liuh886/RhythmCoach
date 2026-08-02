# RhythmCoach Privacy Notes

_Last updated: 2026-08-02_

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

RhythmCoach uses Google Analytics 4 with measurement ID `G-G4TTH49G1C` to understand aggregate site usage and product adoption. Google Analytics may receive technical usage information such as page visits, browser or device characteristics, and referring pages.

RhythmCoach does not intentionally send scripts, saved drafts, session notes, microphone audio, or locally stored recordings to Google Analytics. Analytics is separate from the local rehearsal-data workflow.

Users may limit analytics through browser privacy controls, tracking protection, content blockers, or other settings available in their browser.

## Data deletion and retention

Browser storage remains under the user's control. Removing site data, using private-browsing storage, or browser cleanup may delete scripts, recordings, and rehearsal history. Important recordings should be downloaded before clearing browser data.

Deleting local site data does not necessarily remove analytics records already processed by the analytics provider.

## PWA and offline cache

The installed web app may cache application files so the interface can reopen after a previous successful visit. The service worker does not create an external user profile or transmit rehearsal data.

When the application is online, the Google Analytics script may load independently of the PWA cache.

## External links

RhythmCoach may include links to third-party websites, such as the project repository or a voluntary support page. Those sites operate under their own privacy policies.

## Scope

These notes describe the stable version 1.0.1 implementation in this repository. If future versions add optional cloud synchronization, external speech services, or additional analytics providers, those features must be disclosed separately.
