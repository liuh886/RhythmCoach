# Changelog

All notable changes to RhythmCoach are documented here.

## [1.0.0] - 2026-08-02

### Release

- Promote RhythmCoach from public beta to the first stable release baseline.
- Establish semantic versioning with `web/package.json` as the authoritative application version.
- Display the current version in the in-product help dialog.
- Add an automated version-consistency check covering the PWA cache, README, changelog, and privacy notes.
- Rotate the Service Worker cache to `rhythmcoach-v1.0.0` so installed PWAs receive the stable release assets.

## [0.1.0] - 2026-08-01

### Added

- Three rehearsal modes: timed, voice-follow, and free speaking.
- Local recording, session persistence, and repeat-session comparison.
- First-run product guide with a persistent help entry in the lower-right utility dock.
- Installable PWA metadata and a lightweight offline service worker.
- Rule-based next-session focus derived from completion, long pauses, speaking ratio, and target pace.
- Chinese and English interface support.
- Public beta product documentation and privacy notes.

### Experience

- Preserve the current title, script, and practice tip when moving between the editor and rehearsal views, including local workspace recovery after reload.
- Replace the large rehearsal overlay with a compact translucent HUD that emphasizes pace, progress, audio level, and the primary pause action.
- Add an adaptive timeline beside the script in timed mode, with marker density scaled to the target duration.
- Refine the dark visual system, hierarchy, surfaces, controls, and responsive editor layout.
- Replace the permanently floating recording cards with a compact, collapsible recording drawer that stays clear of the main workspace.
- Rebuild rehearsal history as a responsive, bilingual review surface with clearer comparisons, empty states, and mobile cards.
- Remove mixed-language editor labels and improve keyboard semantics, localized draft names, disabled states, and destructive-action confirmation.

### Audio

- Separate pre-DSP measurement from the recording-style signal path so style changes cannot alter training metrics.
- Refine Natural, Podcast, and Crisp spoken-word profiles with conservative EQ, soft-knee compression, and peak protection.
- Add a speech-aware soft expander to Podcast and Crisp so longer pauses are gently reduced without a hard gate or complete mute.
- Disable browser automatic gain control to prevent double compression and pumping.
- Add lightweight input guidance for low, good, hot, and noisy microphone conditions.
- Target 128 kbps MediaRecorder audio with a browser-compatible fallback.

### Quality

- Core session metric tests.
- Rule-based training focus tests.
- DSP parameter, soft-expander timing, bitrate, and input-level classification tests.
- Adaptive timed-script marker tests.
- TypeScript and Vite production builds in GitHub Actions.
- GitHub Pages deployment after validation.

### Known limitations

- Voice-follow responds to speech activity and silence; it does not align spoken words to the script.
- Estimated pace is intended for rehearsal comparison and is not a speech-recognition measurement.
- Local data may be removed when browser site data is cleared.
- Final tonal quality still depends on the microphone, distance, room, operating-system gain, and browser implementation.
