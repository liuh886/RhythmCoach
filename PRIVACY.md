# RhythmCoach Privacy Notes

_Last updated: 2026-08-01_

RhythmCoach is designed as a local-first rehearsal tool.

## Data stored locally

The application may store the following information in the current browser:

- Scripts and saved draft materials.
- Rehearsal settings.
- Session metrics and comparison history.
- Audio recordings created during rehearsals.

This data is stored through browser storage such as IndexedDB. RhythmCoach does not require an account and does not automatically upload microphone audio to a server.

## Microphone access

Microphone permission is requested only when a rehearsal needs speech activity analysis or recording. Audio is used in the browser for voice activity detection and recording. RhythmCoach does not perform speech-content recognition in version 0.1.0.

## Data deletion and retention

Browser storage remains under the user's control. Removing site data, using private-browsing storage, or browser cleanup may delete scripts, recordings, and rehearsal history. Important recordings should be downloaded before clearing browser data.

## PWA and offline cache

The installed web app may cache application files so the interface can reopen after a previous successful visit. The service worker does not create an external user profile or transmit rehearsal data.

## External links

RhythmCoach may include links to third-party websites, such as the project repository or a voluntary support page. Those sites operate under their own privacy policies.

## Scope

These notes describe the public beta implementation in this repository. If future versions add optional cloud synchronization or external speech services, those features must be disclosed separately and remain opt-in.
