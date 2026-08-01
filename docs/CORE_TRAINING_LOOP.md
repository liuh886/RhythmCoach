# Core Training Loop

## Product contract

RhythmCoach separates three concepts that were previously mixed together:

1. **Target pace**: a user-selected scrolling goal.
2. **Voice activity**: whether the microphone detects active speech or silence.
3. **Estimated pace**: completed text units divided by detected speaking time.

The UI must never present target pace as a measured value.

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

- **Total time**: time while the session state is `running`.
- **Speaking time**: running time classified as speech, including a short grace window to avoid chopping natural micro-pauses.
- **Long pause**: continuous silence of at least 1.5 seconds after speech has started. A paused application session is not counted as a long speech pause.
- **Completion**: scroll position divided by total scrollable distance.
- **Completed units**: total script units multiplied by completion.
- **Estimated pace**: completed units divided by speaking minutes.
- **Comparison**: latest session versus the previous session with the same normalized script key.

## Delivery acceptance criteria

- Finishing from the normal green action produces non-zero metrics after a real session.
- A partial rehearsal uses partial text progress, never the full script length.
- Timed mode continues scrolling during silence.
- Voice-follow mode pauses during sustained silence.
- Free mode never auto-scrolls.
- Target pace is labeled as target pace.
- Estimated pace is explicitly labeled as an estimate.
- A completed session is persisted locally.
- The editor displays the latest two comparable sessions and their deltas.
- CI runs metric tests and a production build before deployment.
