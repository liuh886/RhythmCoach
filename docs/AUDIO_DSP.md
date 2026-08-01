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

No custom EQ, compressor, or limiter. The name “Natural” is used in the interface because browser-level echo cancellation and noise suppression may still be active.

### Podcast

- High-pass: 80 Hz, Q 0.707
- Presence: +1.5 dB at 3.0 kHz, Q 0.8
- Compressor: threshold −20 dB, knee 18 dB, ratio 2.5:1, attack 12 ms, release 160 ms
- Safety limiter: threshold −3 dB, hard knee, ratio 20:1, attack 3 ms, release 90 ms

### Crisp

- High-pass: 95 Hz, Q 0.707
- Presence: +2.0 dB at 3.8 kHz, Q 0.9
- Compressor: threshold −24 dB, knee 12 dB, ratio 3.5:1, attack 8 ms, release 140 ms
- Safety limiter: threshold −3 dB, hard knee, ratio 20:1, attack 3 ms, release 90 ms

No makeup gain is added. This is intentional: forum reports consistently show that aggressive output gain can expose breathing, keyboard noise, room reflections, and pre-existing input clipping.

## Input guidance

The pre-DSP analyser classifies the current input as:

- waiting for speech;
- low input;
- good input;
- hot / near clipping;
- noisy environment.

These are lightweight guidance states, not calibrated SPL or LUFS measurements.

## Why there is no universal “best preset”

Compression thresholds depend on microphone sensitivity, operating-system gain, distance, room noise, and speaking style. A fixed recipe can only be a conservative starting point. RhythmCoach therefore uses modest EQ and compression, avoids makeup gain, and asks the user to correct input distance when the source is too quiet or too hot.

## References consulted

- Web Audio API specification, `DynamicsCompressorNode`: https://www.w3.org/TR/webaudio-1.1/
- MDN `DynamicsCompressorNode`: https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
- MDN `MediaRecorder.audioBitsPerSecond`: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/audioBitsPerSecond
- OBS Compressor Filter guide: https://obsproject.com/kb/compressor-filter
- OBS community discussions on clipping, compression, expansion, and limiter ordering:
  - https://obsproject.com/forum/threads/mic-is-dumb.126101/
  - https://obsproject.com/forum/threads/mic-compressor-amplifies-quiet-sounds.111087/

## Validation boundary

Automated tests verify parameter ranges, preset structure, bitrate configuration, and input-level classifications. Final tonal validation still requires listening tests on representative real devices because browsers and microphones differ materially.
