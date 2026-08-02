import './SessionHistory.css';
import { BarChart3, Gauge, History, PauseCircle, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { compareSessions, createScriptKey } from '../domain/sessionMetrics';
import { useAppStore } from '../store';
import type { Language, PracticeSession, PrompterMode } from '../types';

interface SessionHistoryProps {
  title: string;
  script: string;
  lang: Language;
}

const copy = {
  zh: {
    eyebrow: '训练复盘',
    title: '同稿练习记录',
    subtitle: '比较最近两次练习，重点观察整体语速、长停顿和完成度。',
    attempts: (count: number) => `${count} 次练习`,
    emptyTitle: '还没有可比较的练习',
    emptyBody: '完成第一次训练后，这里会保存本稿件的表现；第二次开始会自动显示变化。',
    timeMode: '时间 / 模式',
    duration: '用时',
    pace: '整体语速',
    completion: '完成度',
    pauses: '长停顿',
    paceChange: '整体语速变化',
    pauseChange: '停顿变化',
    completionChange: '完成度变化',
    remove: '删除训练记录',
    confirmRemove: '确定删除这条训练记录吗？',
    untitled: '未命名稿件',
    modes: { timed: '定时提词', follow: '语音跟随', free: '自由演讲' }
  },
  en: {
    eyebrow: 'Rehearsal review',
    title: 'Repeat-session history',
    subtitle: 'Compare the latest two attempts across delivery pace, long pauses, and completion.',
    attempts: (count: number) => `${count} ${count === 1 ? 'attempt' : 'attempts'}`,
    emptyTitle: 'No comparable rehearsal yet',
    emptyBody: 'Finish one rehearsal to save a baseline. The next attempt will automatically show the change.',
    timeMode: 'Time / mode',
    duration: 'Duration',
    pace: 'Delivery pace',
    completion: 'Completion',
    pauses: 'Long pauses',
    paceChange: 'Delivery pace change',
    pauseChange: 'Pause change',
    completionChange: 'Completion change',
    remove: 'Delete rehearsal record',
    confirmRemove: 'Delete this rehearsal record?',
    untitled: 'Untitled script',
    modes: { timed: 'Timed', follow: 'Voice follow', free: 'Free speaking' }
  }
} as const;

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function Delta({ value, suffix = '', inverse = false }: { value: number; suffix?: string; inverse?: boolean }) {
  if (Math.abs(value) < 0.001) return <span className="history-delta is-neutral">—</span>;
  const improved = inverse ? value < 0 : value > 0;
  const Icon = improved ? TrendingUp : TrendingDown;
  return (
    <span className={`history-delta ${improved ? 'is-improved' : 'is-regressed'}`}>
      <Icon size={14} />
      {value > 0 ? '+' : ''}{value}{suffix}
    </span>
  );
}

interface SessionRowProps {
  session: PracticeSession;
  lang: Language;
  onDelete: (id: string) => void;
}

function SessionRow({ session, lang, onDelete }: SessionRowProps) {
  const text = copy[lang];
  const date = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(session.endedAt);

  const remove = () => {
    if (window.confirm(text.confirmRemove)) onDelete(session.id);
  };

  return (
    <article className="session-row">
      <div className="session-primary" data-label={text.timeMode}>
        <strong>{date}</strong>
        <span>{text.modes[session.mode as PrompterMode]}</span>
      </div>
      <div className="session-value" data-label={text.duration}><strong>{formatDuration(session.metrics.totalTimeMs)}</strong></div>
      <div className="session-value" data-label={text.pace}><strong>{session.metrics.estimatedPace || '—'}</strong><span>{session.metrics.paceUnit}</span></div>
      <div className="session-value" data-label={text.completion}><strong>{Math.round(session.metrics.completionRatio * 100)}%</strong></div>
      <div className="session-value" data-label={text.pauses}><strong>{session.metrics.longPauseCount}</strong></div>
      <button type="button" className="session-delete" onClick={remove} aria-label={text.remove}><Trash2 size={15} /></button>
    </article>
  );
}

export function SessionHistory({ title, script, lang }: SessionHistoryProps) {
  const sessions = useAppStore((state) => state.sessions);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const text = copy[lang];
  const scriptKey = createScriptKey(title || text.untitled, script, lang);
  const relevantSessions = sessions.filter((session) => session.scriptKey === scriptKey);
  const latest = relevantSessions[0];
  const previous = relevantSessions[1];
  const comparison = latest && previous ? compareSessions(latest, previous) : null;

  return (
    <section className="glass-panel session-history" aria-labelledby="session-history-title">
      <header className="session-history-header">
        <div className="session-history-heading">
          <span className="session-history-icon"><History size={18} /></span>
          <div>
            <span className="session-history-eyebrow">{text.eyebrow}</span>
            <h2 id="session-history-title">{text.title}</h2>
            <p>{text.subtitle}</p>
          </div>
        </div>
        <span className="session-count">{text.attempts(relevantSessions.length)}</span>
      </header>

      {comparison && latest && (
        <div className="history-comparison" aria-label={lang === 'zh' ? '最近两次练习变化' : 'Latest attempt changes'}>
          <div className="metric-card">
            <span className="metric-icon"><Gauge size={17} /></span>
            <span>{text.paceChange}</span>
            <Delta value={comparison.estimatedPaceDelta} suffix={` ${latest.metrics.paceUnit}`} />
          </div>
          <div className="metric-card">
            <span className="metric-icon"><PauseCircle size={17} /></span>
            <span>{text.pauseChange}</span>
            <Delta value={comparison.longPauseDelta} inverse />
          </div>
          <div className="metric-card">
            <span className="metric-icon"><BarChart3 size={17} /></span>
            <span>{text.completionChange}</span>
            <Delta value={Math.round(comparison.completionDelta * 100)} suffix="%" />
          </div>
        </div>
      )}

      {relevantSessions.length === 0 ? (
        <div className="session-empty">
          <span><BarChart3 size={22} /></span>
          <div>
            <strong>{text.emptyTitle}</strong>
            <p>{text.emptyBody}</p>
          </div>
        </div>
      ) : (
        <div className="session-table">
          <div className="session-table-head" aria-hidden="true">
            <span>{text.timeMode}</span>
            <span>{text.duration}</span>
            <span>{text.pace}</span>
            <span>{text.completion}</span>
            <span>{text.pauses}</span>
            <span />
          </div>
          <div className="session-list">
            {relevantSessions.slice(0, 8).map((session) => (
              <SessionRow key={session.id} session={session} lang={lang} onDelete={deleteSession} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
