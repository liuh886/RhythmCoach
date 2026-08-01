import { DSP_PRESETS, TARGET_AUDIO_BITRATE_BPS, classifyInputLevel, getRecorderOptions } from '../src/domain/audioDsp.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
}

function expect(condition: boolean, label: string) {
  if (!condition) throw new Error(label);
}

expectEqual(DSP_PRESETS.raw.compressor, null, 'Natural profile stays uncompressed');
expectEqual(DSP_PRESETS.raw.limiter, null, 'Natural profile has no custom limiter');
expect(DSP_PRESETS.podcast.highpassHz === 80, 'Podcast high-pass frequency');
expect(DSP_PRESETS.broadcast.highpassHz === 95, 'Crisp high-pass frequency');

for (const [name, preset] of Object.entries(DSP_PRESETS)) {
  for (const stage of [preset.compressor, preset.limiter]) {
    if (!stage) continue;
    expect(stage.threshold >= -100 && stage.threshold <= 0, `${name} threshold is in Web Audio range`);
    expect(stage.knee >= 0 && stage.knee <= 40, `${name} knee is in Web Audio range`);
    expect(stage.ratio >= 1 && stage.ratio <= 20, `${name} ratio is in Web Audio range`);
    expect(stage.attack >= 0 && stage.attack <= 1, `${name} attack is in Web Audio range`);
    expect(stage.release >= 0 && stage.release <= 1, `${name} release is in Web Audio range`);
  }
}

expectEqual(classifyInputLevel(0, 0), 'waiting', 'No signal waits for a level check');
expectEqual(classifyInputLevel(0.02, 0.12), 'low', 'Quiet speech is flagged');
expectEqual(classifyInputLevel(0.08, 0.45), 'good', 'Normal speech is accepted');
expectEqual(classifyInputLevel(0.08, 0.45, 0.03), 'noisy', 'High background floor is flagged');
expectEqual(classifyInputLevel(0.18, 0.94, 0.03), 'hot', 'Near-clipping peaks take priority');

const options = getRecorderOptions('audio/webm;codecs=opus');
expectEqual(options.mimeType, 'audio/webm;codecs=opus', 'Recorder MIME type');
expectEqual(options.audioBitsPerSecond, TARGET_AUDIO_BITRATE_BPS, 'Recorder bitrate target');

console.log('audio DSP tests passed');
