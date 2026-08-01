import { getTrainingFocus } from '../src/domain/trainingFocus.js';
import type { PracticeSession, SessionMetrics } from '../src/types.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

const baseMetrics: SessionMetrics = {
  totalTimeMs: 60_000,
  speakingTimeMs: 45_000,
  silenceTimeMs: 15_000,
  speakingRatio: 0.75,
  longPauseCount: 1,
  completionRatio: 1,
  completedUnits: 200,
  totalUnits: 200,
  estimatedPace: 200,
  targetPace: 200,
  targetDelta: 0,
  paceUnit: 'CPM'
};

function sessionWith(metrics: Partial<SessionMetrics>): PracticeSession {
  return {
    id: 'focus-test',
    scriptKey: 'focus-test',
    scriptTitle: 'Focus test',
    scriptSnapshot: 'Test script',
    lang: 'zh',
    mode: 'timed',
    startedAt: 0,
    endedAt: 60_000,
    metrics: { ...baseMetrics, ...metrics }
  };
}

expectEqual(
  getTrainingFocus(sessionWith({ completionRatio: 0.7, longPauseCount: 6 }), 'zh').kind,
  'completion',
  'Completion takes priority over pause count'
);
expectEqual(
  getTrainingFocus(sessionWith({ longPauseCount: 3 }), 'zh').kind,
  'pauses',
  'Repeated long pauses produce a pause focus'
);
expectEqual(
  getTrainingFocus(sessionWith({ speakingRatio: 0.5 }), 'zh').kind,
  'continuity',
  'Low speaking ratio produces a continuity focus'
);
expectEqual(
  getTrainingFocus(sessionWith({ targetDelta: -30 }), 'zh').kind,
  'speed-up',
  'Below-target pace produces a controlled speed-up focus'
);
expectEqual(
  getTrainingFocus(sessionWith({ targetDelta: 30 }), 'zh').kind,
  'slow-down',
  'Above-target pace produces a slow-down focus'
);
expectEqual(
  getTrainingFocus(sessionWith({}), 'zh').kind,
  'steady',
  'Stable metrics produce a steady focus'
);

console.log('training focus tests passed');
