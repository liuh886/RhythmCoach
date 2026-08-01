import { Activity, CheckCircle2, Gauge, Sparkles, TimerReset, X } from 'lucide-react';
import type { Language, PracticeSession } from '../types';

interface TrainingFocusProps {
  open: boolean;
  lang: Language;
  sessions: PracticeSession[];
  onClose: () => void;
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function getAdvice(session: PracticeSession, lang: Language) {
  const metrics = session.metrics;

  if (metrics.completionRatio < 0.85) {
    return lang === 'zh'
      ? { title: '先完整讲完', body: '下一遍暂时不追求加速，把完成度提高到 85% 以上。' }
      : { title: 'Finish the script first', body: 'Do not speed up yet. Aim for at least 85% completion on the next attempt.' };
  }
  if (metrics.longPauseCount >= 3) {
    return lang === 'zh'
      ? { title: '减少一次长停顿', body: `本次出现 ${metrics.longPauseCount} 次长停顿。下一遍只专注少一次，目标更容易执行。` }
      : { title: 'Remove one long pause', body: `This attempt had ${metrics.longPauseCount} long pauses. Focus only on reducing that number by one.` };
  }
  if (metrics.speakingRatio < 0.62) {
    return lang === 'zh'
      ? { title: '提高连贯性', body: '发声占比较低。下一遍保持自然微停顿，但避免句间等待过久。' }
      : { title: 'Improve continuity', body: 'Speaking ratio was low. Keep natural micro-pauses, but shorten the gaps between sentences.' };
  }
  if (metrics.targetDelta !== null && metrics.targetDelta < -20) {
    return lang === 'zh'
      ? { title: '轻微提速', body: '估算语速低于目标。下一遍只提高约 10–15 CPM/WPM，不要一次拉得太快。' }
      : { title: 'Increase pace slightly', body: 'Estimated pace was below target. Raise it by only 10–15 CPM/WPM next time.' };
  }
  if (metrics.targetDelta !== null && metrics.targetDelta > 20) {
    return lang === 'zh'
      ? { title: '稍微放慢', body: '估算语速高于目标。下一遍把重点放在清楚收尾和句间呼吸。' }
      : { title: 'Slow down slightly', body: 'Estimated pace was above target. Focus on clear endings and breathing between sentences.' };
  }
  return lang === 'zh'
    ? { title: '保持当前节奏', body: '本次完成度和节奏已经稳定。下一遍只选择一个细节继续改善。' }
    : { title: 'Keep the current rhythm', body: 'Completion and pace are stable. Choose only one small detail to improve next time.' };
}

export function TrainingFocus({ open, lang, sessions, onClose }: TrainingFocusProps) {
  if (!open) return null;
  const latest = sessions[0];
  const recentCount = sessions.filter((session) => Date.now() - session.endedAt <= 7 * 24 * 60 * 60 * 1000).length;
  const advice = latest ? getAdvice(latest, lang) : null;

  return (
    <div className="product-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="product-dialog focus-dialog" role="dialog" aria-modal="true" aria-labelledby="training-focus-title">
        <button className="btn-icon product-dialog-close" onClick={onClose} aria-label={lang === 'zh' ? '关闭训练建议' : 'Close training focus'}>
          <X size={17} />
        </button>

        <div className="focus-title-row">
          <div className="focus-mark"><Sparkles size={20} /></div>
          <div>
            <span>{lang === 'zh' ? '轻量训练建议' : 'Lightweight coaching'}</span>
            <h2 id="training-focus-title">{lang === 'zh' ? '下一遍，只改一个重点' : 'Change one thing next time'}</h2>
          </div>
        </div>

        {!latest ? (
          <div className="focus-empty">
            <Activity size={28} />
            <p>{lang === 'zh' ? '完成第一次训练后，这里会根据完成度、停顿和目标语速给出一条明确建议。' : 'Complete one rehearsal to receive a clear suggestion based on completion, pauses, and target pace.'}</p>
          </div>
        ) : (
          <>
            <div className="focus-advice">
              <small>{lang === 'zh' ? '建议重点' : 'Recommended focus'}</small>
              <h3>{advice?.title}</h3>
              <p>{advice?.body}</p>
            </div>

            <div className="focus-metrics">
              <div><TimerReset size={16} /><span>{lang === 'zh' ? '用时' : 'Time'}</span><strong>{formatDuration(latest.metrics.totalTimeMs)}</strong></div>
              <div><CheckCircle2 size={16} /><span>{lang === 'zh' ? '完成度' : 'Completion'}</span><strong>{Math.round(latest.metrics.completionRatio * 100)}%</strong></div>
              <div><Gauge size={16} /><span>{lang === 'zh' ? '估算语速' : 'Estimated pace'}</span><strong>{latest.metrics.estimatedPace} {latest.metrics.paceUnit}</strong></div>
            </div>

            <p className="focus-footnote">
              {lang === 'zh'
                ? `过去 7 天完成 ${recentCount} 次训练。建议由现有训练指标生成，不进行语音内容识别。`
                : `${recentCount} rehearsals in the past 7 days. Suggestions use existing session metrics and do not analyze speech content.`}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
