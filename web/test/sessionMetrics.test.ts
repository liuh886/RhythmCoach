import { buildSessionMetrics, compareSessions, countScriptUnits, createScriptKey, normalizePracticeSessionPace } from '../src/domain/sessionMetrics.js';
import type { PracticeSession } from '../src/types.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

expectEqual(countScriptUnits('你好 RhythmCoach 2026！', 'zh'), 17, 'Chinese unit counting');
expectEqual(countScriptUnits("A calm speaker doesn't rush.", 'en'), 5, 'English word counting');
expectEqual(createScriptKey('Demo', 'Same script', 'en'), createScriptKey('Demo', 'Same   script', 'en'), 'Stable script key');

const partial = buildSessionMetrics({
  totalTimeMs: 60_000,
  speakingTimeMs: 40_000,
  longPauseCount: 2,
  completionRatio: 0.5,
  totalUnits: 200,
  targetPace: 180,
  lang: 'zh'
});
expectEqual(partial.completedUnits, 100, 'Partial completion uses progress, not full text');
expectEqual(partial.estimatedPace, 100, 'Estimated pace uses elapsed rehearsal time');
expectEqual(partial.targetDelta, -80, 'Target delta uses elapsed-time pace');
expectEqual(partial.silenceTimeMs, 20_000, 'Silence duration');

const sameDeliveryDifferentVad = buildSessionMetrics({
  totalTimeMs: 60_000,
  speakingTimeMs: 25_000,
  longPauseCount: 4,
  completionRatio: 0.5,
  totalUnits: 200,
  targetPace: 180,
  lang: 'zh'
});
expectEqual(sameDeliveryDifferentVad.estimatedPace, partial.estimatedPace, 'Voice-activity classification does not distort delivery pace');

const legacySession: PracticeSession = {
  id: 'legacy',
  scriptKey: 'same',
  scriptTitle: 'Demo',
  scriptSnapshot: 'x',
  lang: 'zh',
  mode: 'timed',
  startedAt: 0,
  endedAt: 60_000,
  metrics: { ...partial, estimatedPace: 150, targetDelta: -30 }
};
const normalizedLegacy = normalizePracticeSessionPace(legacySession);
expectEqual(normalizedLegacy.metrics.estimatedPace, 100, 'Legacy pace is normalized from stored elapsed time');
expectEqual(normalizedLegacy.metrics.targetDelta, -80, 'Legacy target delta is normalized');

const previous: PracticeSession = {
  id: 'a', scriptKey: 'same', scriptTitle: 'Demo', scriptSnapshot: 'x', lang: 'zh', mode: 'timed',
  startedAt: 0, endedAt: 60_000,
  metrics: { ...partial, totalTimeMs: 60_000, estimatedPace: 150, longPauseCount: 3, completionRatio: 0.8, speakingRatio: 0.65 }
};
const current: PracticeSession = {
  ...previous,
  id: 'b',
  metrics: { ...previous.metrics, totalTimeMs: 55_000, estimatedPace: 165, longPauseCount: 1, completionRatio: 1, speakingRatio: 0.75 }
};
const comparison = compareSessions(current, previous);
expectEqual(comparison.estimatedPaceDelta, 15, 'Pace comparison');
expectEqual(comparison.longPauseDelta, -2, 'Pause comparison');
expectEqual(Math.round(comparison.completionDelta * 100), 20, 'Completion comparison');

console.log('sessionMetrics tests passed');
