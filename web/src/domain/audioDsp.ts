export type DspProfile = 'raw' | 'podcast' | 'broadcast';

export interface CompressorPreset {
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
}

export interface DspPreset {
  highpassHz: number | null;
  highpassQ: number;
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
 * They intentionally avoid makeup gain, aggressive high-shelf boosts and
 * multiband processing because those choices amplify room noise and vary too
 * much across phones, laptops, headsets and USB microphones.
 */
export const DSP_PRESETS: Record<DspProfile, DspPreset> = {
  raw: {
    highpassHz: null,
    highpassQ: 0.707,
    presenceHz: null,
    presenceGainDb: 0,
    presenceQ: 0.8,
    compressor: null,
    limiter: null
  },
  podcast: {
    highpassHz: 80,
    highpassQ: 0.707,
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
