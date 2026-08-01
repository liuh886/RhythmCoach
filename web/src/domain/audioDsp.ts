export type DspProfile = 'raw' | 'podcast' | 'broadcast';

export interface CompressorPreset {
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
}

export interface ExpanderPreset {
  floorGain: number;
  holdMs: number;
  openTimeConstant: number;
  closeTimeConstant: number;
}

export interface DspPreset {
  highpassHz: number | null;
  highpassQ: number;
  expander: ExpanderPreset | null;
  presenceHz: number | null;
  presenceGainDb: number;
  presenceQ: number;
  compressor: CompressorPreset | null;
  limiter: CompressorPreset | null;
}

export type InputLevelStatus = 'waiting' | 'low' | 'good' | 'hot' | 'noisy';

export const TARGET_AUDIO_BITRATE_BPS = 128_000;

const SAFETY_LIMITER: CompressorPreset = {
  threshold: -3,
  knee: 0,
  ratio: 20,
  attack: 0.003,
  release: 0.09
};

/**
 * Conservative spoken-word presets for browser microphones.
 *
 * The processed profiles use a soft, speech-aware downward expander rather
 * than a hard noise gate. It never mutes the signal and opens quickly so quiet
 * syllables and word endings are less likely to be clipped.
 */
export const DSP_PRESETS: Record<DspProfile, DspPreset> = {
  raw: {
    highpassHz: null,
    highpassQ: 0.707,
    expander: null,
    presenceHz: null,
    presenceGainDb: 0,
    presenceQ: 0.8,
    compressor: null,
    limiter: null
  },
  podcast: {
    highpassHz: 80,
    highpassQ: 0.707,
    expander: {
      floorGain: 0.38,
      holdMs: 320,
      openTimeConstant: 0.012,
      closeTimeConstant: 0.18
    },
    presenceHz: 3000,
    presenceGainDb: 1.5,
    presenceQ: 0.8,
    compressor: {
      threshold: -20,
      knee: 18,
      ratio: 2.5,
      attack: 0.012,
      release: 0.16
    },
    limiter: SAFETY_LIMITER
  },
  broadcast: {
    highpassHz: 95,
    highpassQ: 0.707,
    expander: {
      floorGain: 0.28,
      holdMs: 280,
      openTimeConstant: 0.008,
      closeTimeConstant: 0.15
    },
    presenceHz: 3800,
    presenceGainDb: 2,
    presenceQ: 0.9,
    compressor: {
      threshold: -24,
      knee: 12,
      ratio: 3.5,
      attack: 0.008,
      release: 0.14
    },
    limiter: SAFETY_LIMITER
  }
};

export function getExpanderTargetGain(expander: ExpanderPreset | null, detectedSpeech: boolean, silenceDurationMs: number): number {
  if (!expander) return 1;
  return detectedSpeech || silenceDurationMs < expander.holdMs ? 1 : expander.floorGain;
}

export function classifyInputLevel(rms: number, peak: number, noiseFloor = 0): InputLevelStatus {
  if (!Number.isFinite(rms) || !Number.isFinite(peak) || rms <= 0 || peak <= 0) return 'waiting';
  if (peak >= 0.92 || rms >= 0.3) return 'hot';
  if (noiseFloor >= 0.025) return 'noisy';
  if (rms < 0.025) return 'low';
  return 'good';
}

export function getRecorderOptions(mimeType?: string) {
  return mimeType
    ? { mimeType, audioBitsPerSecond: TARGET_AUDIO_BITRATE_BPS }
    : { audioBitsPerSecond: TARGET_AUDIO_BITRATE_BPS };
}
