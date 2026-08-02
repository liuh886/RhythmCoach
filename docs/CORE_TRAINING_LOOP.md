# Core Training Loop

## Product contract

RhythmCoach separates three concepts that were previously mixed together:

1. **Target pace**: a user-selected scrolling goal based on total script units and intended total delivery time.
2. **Voice activity**: whether the microphone detects active speech or silence.
3. **Estimated delivery pace**: completed text units divided by total rehearsal time while the session is running.

The UI must never present target pace as a measured value. Voice-activity classification must not change the primary pace metric.

## Session lifecycle

A rehearsal follows a single lifecycle:

`idle → requesting_permission → ready → running ↔ paused → finishing → completed`

A microphone failure enters `error`. Timed and free modes may continue without microphone-derived metrics; voice-follow mode requires microphone access.

## Mode behavior

| Mode | Auto-scroll | Silence behavior | Primary use |
|---|---|---|---|
| Timed | Yes | Continues | Fixed-duration delivery |
| Voice follow | Yes | Pauses after speech grace period | Guided rehearsal |
| Free | No | Metrics only | Unscripted/manual delivery |

## Metric definitions

- **Total time**: time while the session state is `running`; deliberate application pauses are excluded.
- **Speaking time**: running time classified as speech, including a short grace window to avoid chopping natural micro-pauses.
- **Silence time**: total running time minus speaking time.
- **Speaking ratio**: speaking time divided by total running time.
- **Long pause**: continuous silence of at least 1.5 seconds after speech has started. A paused application session is not counted as a long speech pause.
- **Completion**: scroll position divided by total scrollable distance.
- **Completed units**: total script units multiplied by completion.
- **Estimated delivery pace**: completed units divided by total running minutes. This includes natural pauses and breathing, matching the denominator used by target pace.
- **Comparison**: latest session versus the previous session with the same normalized script key.

Voice activity remains useful for speaking ratio, long-pause detection, voice-follow scrolling, and input guidance. It does not determine estimated delivery pace.

## Persisted-session normalization

Sessions created before the elapsed-time pace correction may contain an estimate based on detected speaking time. On load, RhythmCoach recalculates `estimatedPace` and `targetDelta` from the already stored `completedUnits`, `totalTimeMs`, and `targetPace`, then writes the normalized sessions back to local storage.

## Delivery acceptance criteria

- Finishing from the normal green action produces non-zero metrics after a real session.
- A partial rehearsal uses partial text progress, never the full script length.
- Two sessions with the same completion and total time produce the same estimated delivery pace even if voice-activity detection reports different speaking times.
- Timed mode continues scrolling during silence.
- Voice-follow mode pauses during sustained silence.
- Free mode never auto-scrolls.
- Target pace is labeled as target pace.
- Estimated delivery pace is explicitly labeled as an estimate that includes natural pauses and breathing.
- A completed session is persisted locally.
- Older persisted sessions are normalized to the current pace definition during load.
- The editor displays the latest two comparable sessions and their deltas.
- CI runs metric tests and a production build before deployment.
