# Changelog

All notable changes to RhythmCoach are documented here.

## [Unreleased]

### Added

- Add a bilingual opening–outline–closing starter template for Podcast rehearsal.
- Add focused tests that verify the podcast template is seeded only for empty or untouched starter workspaces.

### Changed

- Reposition RhythmCoach as a pre-recording rehearsal tool for speakers and podcasters.
- Rename the user-facing Free speaking mode to Podcast rehearsal while retaining the internal `free` identifier for persisted-session compatibility.
- Keep Podcast rehearsal fully manual: creators control content progress while recording, long-pause, completion, and repeat-session metrics continue unchanged.
- Update the editor, first-run guide, header, rehearsal HUD, history, metadata, and documentation to use the new product positioning.

## [1.0.1] - 2026-08-02

### Added

- Add restrained emphasis, short-pause, long-pause, and suggested-breath guidance to curated Chinese practice materials without placing marker syntax in editable text.
- Add the contextual “平翘舌专项｜四十本杂志” story with minimal-pair vocabulary, low-contrast “平／翘” position markers, and articulation hover guidance.

### Changed

- Replace scattered utility controls with a unified application header and a calmer two-panel workspace.
- Add persistent dark and light appearances across the editor, library, dialogs, history, recordings, and rehearsal view.
- Consolidate start, pause or resume, finish, and restart actions in a consistent lower-right rehearsal control area.
- Move pause guidance above the reading line and breath guidance below it so annotations no longer interrupt the script.
- Remove delivery cues automatically after the script is edited, preventing guidance from drifting out of alignment.
- Discard the completed attempt's audio file when Restart is selected, including recordings still finishing asynchronously, while retaining session metrics for comparison.
- Remove the non-actionable duration-change comparison and keep repeat-session feedback focused on pace, long pauses, and completion.

### Fixed

- Calculate estimated delivery pace from completed text units and total rehearsal time so natural pauses and breathing cannot inflate the result.
- Recalculate legacy saved pace values from stored completion and elapsed-time data during local load.
- Use the same elapsed-time definition for free-mode live pace, summaries, history comparisons, and coaching guidance.

### Quality

- Extend automated coverage for theme behavior, delivery-markup parsing, curated-material alignment, specialty target vocabulary, and hidden marker syntax.
- Refresh current-version documentation and rotate the PWA cache for the patch release.

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
