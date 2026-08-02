import type { Language, PracticeSession } from '../types';

export type TrainingFocusKind = 'completion' | 'pauses' | 'continuity' | 'speed-up' | 'slow-down' | 'steady';

export interface TrainingFocusAdvice {
  kind: TrainingFocusKind;
  title: string;
  body: string;
}

export function getTrainingFocus(session: PracticeSession, lang: Language): TrainingFocusAdvice {
  const metrics = session.metrics;

  if (metrics.completionRatio < 0.85) {
    return lang === 'zh'
      ? { kind: 'completion', title: '先完整讲完', body: '下一遍暂时不追求加速，把完成度提高到 85% 以上。' }
      : { kind: 'completion', title: 'Finish the script first', body: 'Do not speed up yet. Aim for at least 85% completion on the next attempt.' };
  }
  if (metrics.longPauseCount >= 3) {
    return lang === 'zh'
      ? { kind: 'pauses', title: '减少一次长停顿', body: `本次出现 ${metrics.longPauseCount} 次长停顿。下一遍只专注少一次，目标更容易执行。` }
      : { kind: 'pauses', title: 'Remove one long pause', body: `This attempt had ${metrics.longPauseCount} long pauses. Focus only on reducing that number by one.` };
  }
  if (metrics.speakingRatio < 0.62) {
    return lang === 'zh'
      ? { kind: 'continuity', title: '提高连贯性', body: '发声占比较低。下一遍保持自然微停顿，但避免句间等待过久。' }
      : { kind: 'continuity', title: 'Improve continuity', body: 'Speaking ratio was low. Keep natural micro-pauses, but shorten the gaps between sentences.' };
  }
  if (metrics.targetDelta !== null && metrics.targetDelta < -20) {
    return lang === 'zh'
      ? { kind: 'speed-up', title: '轻微提速', body: '整体估算语速低于目标。下一遍只提高约 10–15 CPM/WPM，不要一次拉得太快。' }
      : { kind: 'speed-up', title: 'Increase pace slightly', body: 'Estimated delivery pace was below target. Raise it by only 10–15 CPM/WPM next time.' };
  }
  if (metrics.targetDelta !== null && metrics.targetDelta > 20) {
    return lang === 'zh'
      ? { kind: 'slow-down', title: '稍微放慢', body: '整体估算语速高于目标。下一遍把重点放在清楚收尾和句间呼吸。' }
      : { kind: 'slow-down', title: 'Slow down slightly', body: 'Estimated delivery pace was above target. Focus on clear endings and breathing between sentences.' };
  }
  return lang === 'zh'
    ? { kind: 'steady', title: '保持当前节奏', body: '本次完成度和节奏已经稳定。下一遍只选择一个细节继续改善。' }
    : { kind: 'steady', title: 'Keep the current rhythm', body: 'Completion and pace are stable. Choose only one small detail to improve next time.' };
}
