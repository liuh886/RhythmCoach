# RhythmCoach Audio DSP

## Design goal

RhythmCoach uses a deliberately small spoken-word signal chain. The goal is stable, clear rehearsal recordings across phones, laptops, headsets, and USB microphones—not mastering-grade processing or microphone emulation.

The application keeps two paths separate:

```text
microphone ──→ analyser ──→ speech activity and pause metrics
           └─→ recording style DSP ──→ MediaRecorder
```

Changing the recording style therefore cannot change speaking time, long-pause count, or estimated pace.

## Capture policy

- Mono input is preferred.
- Echo cancellation and browser noise suppression are requested as best-effort constraints.
- Browser automatic gain control is disabled to avoid interacting unpredictably with the application compressor.
- A 48 kHz sample rate is requested as an ideal constraint; browsers may choose another supported rate.
- MediaRecorder targets 128 kbps audio and falls back to browser defaults when the bitrate option is rejected.

## Recording styles

### Natural (`raw` internally)

No custom EQ, expander, compressor, or limiter. The name “Natural” is used in the interface because browser-level echo cancellation and noise suppression may still be active.

### Podcast

- High-pass: 80 Hz, Q 0.707
- Speech-aware soft expander: floor gain 0.38 (about −8.4 dB), hold 320 ms, open time constant 12 ms, close time constant 180 ms
- Presence: +1.5 dB at 3.0 kHz, Q 0.8
- Compressor: threshold −20 dB, knee 18 dB, ratio 2.5:1, attack 12 ms, release 160 ms
- Safety limiter: threshold −3 dB, hard knee, ratio 20:1, attack 3 ms, release 90 ms

### Crisp

- High-pass: 95 Hz, Q 0.707
- Speech-aware soft expander: floor gain 0.28 (about −11.1 dB), hold 280 ms, open time constant 8 ms, close time constant 150 ms
- Presence: +2.0 dB at 3.8 kHz, Q 0.9
- Compressor: threshold −24 dB, knee 12 dB, ratio 3.5:1, attack 8 ms, release 140 ms
- Safety limiter: threshold −3 dB, hard knee, ratio 20:1, attack 3 ms, release 90 ms

No makeup gain is added. This is intentional: forum reports consistently show that aggressive output gain can expose breathing, keyboard noise, room reflections, and pre-existing input clipping.

## Why a soft expander was added

Audio engineers and experienced OBS users commonly prefer a downward expander over a hard gate for spoken voice. A gate switches between open and closed and can cut whispers, word beginnings, and endings. An expander instead makes quiet material quieter and can transition more smoothly.

RhythmCoach's implementation is intentionally conservative:

- It never fully mutes the signal.
- It acts only on Podcast and Crisp recordings; Natural remains untouched.
- It waits roughly 0.3 seconds before reducing a pause, protecting word tails and brief breaths.
- It reopens rapidly when speech returns.
- Its control signal comes from the pre-DSP analyser, so it does not change training metrics.
- If background noise is loud enough to resemble speech, it stays open rather than pumping or chopping the recording.

The expander is inserted after the high-pass filter and before tonal EQ, compression, and limiting. This reduces low-level room noise before compression can make that noise more noticeable.

## Why there is no hard noise gate

A hard gate cannot separate speech from noise while both occur. It can only pass everything or attenuate everything, and fixed thresholds are highly dependent on microphone gain, distance, and room conditions. For a general-purpose browser product, the risk of clipped syllables is greater than the benefit of complete silence between phrases.

## Why there is no default de-esser

De-essing is useful when a specific voice and microphone combination produces excessive sibilance, but the required frequency and reduction vary significantly. Community discussions repeatedly note that excessive de-essing makes speech thin, dull, or unnatural. A fixed cross-device de-esser is therefore not enabled by default.

## Why loudness normalization remains a later export feature

Podcast engineers often apply loudness normalization after editing, commonly around −19 LUFS for mono or −16 LUFS for stereo. Accurate integrated loudness measurement requires gated, whole-recording analysis and should be applied after capture, not as an always-on real-time effect. RhythmCoach will not label peak normalization as LUFS normalization or add a partial implementation merely to make recordings louder.

## Input guidance

The pre-DSP analyser classifies the current input as:

- waiting for speech;
- low input;
- good input;
- hot / near clipping;
- noisy environment.

These are lightweight guidance states, not calibrated SPL or LUFS measurements.

## Why there is no universal “best preset”

Compression thresholds depend on microphone sensitivity, operating-system gain, distance, room noise, and speaking style. A fixed recipe can only be a conservative starting point. RhythmCoach therefore uses modest EQ and compression, avoids makeup gain, adds only gentle pause attenuation, and asks the user to correct input distance when the source is too quiet or too hot.

## References consulted

- Web Audio API specification, `DynamicsCompressorNode` and `AudioParam`: https://www.w3.org/TR/webaudio-1.1/
- MDN `AudioParam.setTargetAtTime`: https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime
- MDN `DynamicsCompressorNode`: https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
- MDN `MediaRecorder.audioBitsPerSecond`: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/audioBitsPerSecond
- OBS Expander Filter guide: https://obsproject.com/kb/expander-filter
- OBS Compressor Filter guide: https://obsproject.com/kb/compressor-filter
- OBS community discussions on gates, expansion, clipping, compression, and limiter ordering:
  - https://obsproject.com/forum/threads/noise-gate-help-please.152736/
  - https://obsproject.com/forum/threads/mic-only-picking-up-my-voice-if-im-loud.129044/
  - https://obsproject.com/forum/threads/mic-compressor-amplifies-quiet-sounds.111087/
  - https://obsproject.com/forum/threads/obs-correct-order.182424/
- Reddit discussions on podcast loudness and de-essing:
  - https://www.reddit.com/r/audioengineering/comments/ovv4wn/
  - https://www.reddit.com/r/audioengineering/comments/1pul3to/

## Validation boundary

Automated tests verify parameter ranges, preset structure, soft-expander timing and floor behavior, bitrate configuration, and input-level classifications. Final tonal validation still requires listening tests on representative real devices because browsers and microphones differ materially.
