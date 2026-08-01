# Changelog

All notable changes to RhythmCoach are documented here.

## [0.1.0] - 2026-08-01

### Added

- Three rehearsal modes: timed, voice-follow, and free speaking.
- Local recording, session persistence, and repeat-session comparison.
- First-run product guide with a persistent help entry in the lower-right utility dock.
- Installable PWA metadata and a lightweight offline service worker.
- Rule-based next-session focus derived from completion, long pauses, speaking ratio, and target pace.
- Chinese and English interface support.
- Public beta product documentation and privacy notes.

### Quality

- Core session metric tests.
- TypeScript and Vite production builds in GitHub Actions.
- GitHub Pages deployment after validation.

### Known limitations

- Voice-follow responds to speech activity and silence; it does not align spoken words to the script.
- Estimated pace is intended for rehearsal comparison and is not a speech-recognition measurement.
- Local data may be removed when browser site data is cleared.
