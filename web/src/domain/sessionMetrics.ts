import type { Language, PracticeSession, SessionComparison, SessionMetrics } from '../types';

export interface BuildSessionMetricsInput {
  totalTimeMs: number;
  speakingTimeMs: number;
  longPauseCount: number;
  completionRatio: number;
  totalUnits: number;
  targetPace?: number | null;
  lang: Language;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function countScriptUnits(script: string, lang: Language): number {
  if (lang === 'zh') {
    return (script.match(/[\u3400-\u9fffA-Za-z0-9]/g) || []).length;
  }
  return (script.match(/\b[\p{L}\p{N}'’-]+\b/gu) || []).length;
}

export function createScriptKey(title: string, script: string, lang: Language): string {
  const normalized = `${lang}|${title.trim().toLowerCase()}|${script.replace(/\s+/g, ' ').trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `script_${(hash >>> 0).toString(36)}`;
}

export function estimateDeliveryPace(completedUnits: number, totalTimeMs: number): number {
  const safeUnits = Math.max(0, Math.round(completedUnits));
  const elapsedMinutes = Math.max(0, totalTimeMs) / 60_000;
  return elapsedMinutes > 0.03 && safeUnits > 0
    ? Math.round(safeUnits / elapsedMinutes)
    : 0;
}

export function normalizePracticeSessionPace(session: PracticeSession): PracticeSession {
  const estimatedPace = estimateDeliveryPace(session.metrics.completedUnits, session.metrics.totalTimeMs);
  const targetDelta = session.metrics.targetPace !== null && estimatedPace > 0
    ? estimatedPace - session.metrics.targetPace
    : null;

  if (session.metrics.estimatedPace === estimatedPace && session.metrics.targetDelta === targetDelta) {
    return session;
  }

  return {
    ...session,
    metrics: {
      ...session.metrics,
      estimatedPace,
      targetDelta
    }
  };
}

export function buildSessionMetrics(input: BuildSessionMetricsInput): SessionMetrics {
  const totalTimeMs = Math.max(0, Math.round(input.totalTimeMs));
  const speakingTimeMs = clamp(Math.round(input.speakingTimeMs), 0, totalTimeMs);
  const completionRatio = clamp(input.completionRatio, 0, 1);
  const totalUnits = Math.max(0, Math.round(input.totalUnits));
  const completedUnits = completionRatio >= 0.995
    ? totalUnits
    : Math.min(totalUnits, Math.round(totalUnits * completionRatio));
  const estimatedPace = estimateDeliveryPace(completedUnits, totalTimeMs);
  const targetPace = input.targetPace && input.targetPace > 0 ? Math.round(input.targetPace) : null;

  return {
    totalTimeMs,
    speakingTimeMs,
    silenceTimeMs: Math.max(0, totalTimeMs - speakingTimeMs),
    speakingRatio: totalTimeMs > 0 ? speakingTimeMs / totalTimeMs : 0,
    longPauseCount: Math.max(0, Math.round(input.longPauseCount)),
    completionRatio,
    completedUnits,
    totalUnits,
    estimatedPace,
    targetPace,
    targetDelta: targetPace !== null && estimatedPace > 0 ? estimatedPace - targetPace : null,
    paceUnit: input.lang === 'zh' ? 'CPM' : 'WPM'
  };
}

export function compareSessions(current: PracticeSession, previous: PracticeSession): SessionComparison {
  return {
    durationDeltaMs: current.metrics.totalTimeMs - previous.metrics.totalTimeMs,
    estimatedPaceDelta: current.metrics.estimatedPace - previous.metrics.estimatedPace,
    longPauseDelta: current.metrics.longPauseCount - previous.metrics.longPauseCount,
    completionDelta: current.metrics.completionRatio - previous.metrics.completionRatio,
    speakingRatioDelta: current.metrics.speakingRatio - previous.metrics.speakingRatio
  };
}

export function getScrollCompletion(element: Pick<HTMLElement, 'scrollTop' | 'scrollHeight' | 'clientHeight'> | null): number {
  if (!element) return 0;
  const maxScroll = Math.max(1, element.scrollHeight - element.clientHeight);
  return clamp(element.scrollTop / maxScroll, 0, 1);
}
