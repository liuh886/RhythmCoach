# RhythmCoach Product Governance

Updated: 2026-08-03

## Product boundary

RhythmCoach is a local-first rehearsal coach, not a cloud recording service. Scripts, sessions, metrics, and microphone audio remain on-device by default. Account, analytics, and future payment failures must never block writing, recording, playback, rename, deletion, or training.

## Current governed baseline

The maintained product contract includes:

- installable PWA with local scripts, training history, and recordings;
- three rehearsal modes, timing, voice activity, long-pause and completion metrics;
- curated Mandarin emphasis, pause, breath, and flat/retroflex guidance;
- local recording styles based on Web Audio API processing;
- optional shared Supabase account UI and typed entitlement adapter;
- `rhythmcoach.recording_download` defined but payment enforcement disabled;
- no audio upload and no script or recording content in analytics.

## Next decision gates

### Gate 1 — repeatable coaching value

Before enforcing payment, turn existing session metrics into a useful local progress loop:

- weekly practice count and duration;
- pace, completion, speaking-ratio, and long-pause trends;
- same-script comparison over recent attempts;
- one restrained next-session recommendation derived only from existing metrics;
- honest missing-data and insufficient-history states.

No speech recognition, pronunciation scoring, or cloud inference is authorized by this gate.

### Gate 2 — data portability and recovery

Local-first data must be exportable and recoverable before users are asked to invest more history in the product:

- versioned export of scripts, sessions, metrics, and recording metadata;
- optional audio inclusion rather than mandatory large archives;
- validation before restore;
- restore preview and explicit conflict policy;
- post-restore integrity verification;
- no upload to GitHub Pages or Supabase during export/restore.

### Gate 3 — real-device PWA recording reliability

Validate Android Chrome and iPhone home-screen operation for:

- microphone permission grant, denial, and later revocation;
- backgrounding, screen lock, interruption, and return;
- low storage and failed persistence;
- service-worker update while local recordings exist;
- offline completion and later reopen.

### Gate 4 — paid download experiment

Recording-download enforcement remains off until Gates 1–3 are reviewed. A paid experiment must preserve playback, rename, deletion, and access to existing recordings. Only a verified Stripe webhook may grant the entitlement.

## Release rules

Every product PR must preserve:

1. local-only audio by default;
2. free core rehearsal and recording;
3. explicit distinction between target pace and estimated achieved pace;
4. no recording, script, or local filename in analytics;
5. bilingual and accessible states for changed flows;
6. safe behavior when account, network, analytics, or future payment services fail.