import './SessionHistory.css';
import { BarChart3, Clock3, Gauge, PauseCircle, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { compareSessions, createScriptKey } from '../domain/sessionMetrics';
import { useAppStore } from '../store';
import type { Language, PracticeSession } from '../types';

interface SessionHistoryProps { title: string; script: string; lang: Language; }
const formatDuration = (milliseconds: number) => { const seconds = Math.max(0, Math.round(milliseconds / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };
function Delta({ value, suffix = '', inverse = false }: { value: number; suffix?: string; inverse?: boolean }) {
  if (Math.abs(value) < 0.001) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const improved = inverse ? value < 0 : value > 0; const Icon = improved ? TrendingUp : TrendingDown;
  return <span style={{ color: improved ? 'var(--status-stable)' : '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon size={14} /> {value > 0 ? '+' : ''}{value}{suffix}</span>;
}
function SessionRow({ session, onDelete }: { session: PracticeSession; onDelete: (id: string) => void }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(4, minmax(72px, auto)) 32px', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', fontSize: '0.84rem' }}>
    <div><div style={{ color: 'var(--text-primary)', fontWeight: 650 }}>{new Date(session.endedAt).toLocaleString()}</div><div style={{ color: 'var(--text-muted)', marginTop: 3 }}>{session.mode === 'timed' ? '定时提词' : session.mode === 'follow' ? '语音跟随' : '自由演讲'}</div></div>
    <span>{formatDuration(session.metrics.totalTimeMs)}</span><span>{session.metrics.estimatedPace || '—'} {session.metrics.paceUnit}</span><span>{Math.round(session.metrics.completionRatio * 100)}%</span><span>{session.metrics.longPauseCount}</span>
    <button className="btn-icon" onClick={() => onDelete(session.id)} title="删除记录" style={{ width: 28, height: 28, padding: 0, color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}><Trash2 size={14} /></button>
  </div>;
}
export function SessionHistory({ title, script, lang }: SessionHistoryProps) {
  const sessions = useAppStore((state) => state.sessions); const deleteSession = useAppStore((state) => state.deleteSession);
  const scriptKey = createScriptKey(title || '未命名稿件', script, lang); const relevantSessions = sessions.filter((session) => session.scriptKey === scriptKey);
  const latest = relevantSessions[0]; const previous = relevantSessions[1]; const comparison = latest && previous ? compareSessions(latest, previous) : null;
  return <section className="glass-panel" style={{ padding: 24, marginTop: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 18 }}><div><h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={20} color="var(--accent-primary)" /> 训练记录</h3><p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.86rem' }}>同一稿件会自动比较最近两次练习。语速为基于文本进度与有效发声时长的估算值。</p></div><span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{relevantSessions.length} 次</span></div>
    {comparison && latest && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}><div className="metric-card"><Clock3 size={18} /><span>用时变化</span><Delta value={Math.round(comparison.durationDeltaMs / 1000)} suffix="s" inverse /></div><div className="metric-card"><Gauge size={18} /><span>估算语速</span><Delta value={comparison.estimatedPaceDelta} suffix={` ${latest.metrics.paceUnit}`} /></div><div className="metric-card"><PauseCircle size={18} /><span>长停顿</span><Delta value={comparison.longPauseDelta} inverse /></div><div className="metric-card"><BarChart3 size={18} /><span>完成度</span><Delta value={Math.round(comparison.completionDelta * 100)} suffix="%" /></div></div>}
    {relevantSessions.length === 0 ? <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>完成第一次练习后，这里会显示可比较的训练记录。</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowX: 'auto' }}><div style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(4, minmax(72px, auto)) 32px', gap: 12, padding: '0 14px', color: 'var(--text-muted)', fontSize: '0.76rem' }}><span>时间 / 模式</span><span>用时</span><span>估算语速</span><span>完成度</span><span>长停顿</span><span /></div>{relevantSessions.slice(0, 8).map((session) => <SessionRow key={session.id} session={session} onDelete={deleteSession} />)}</div>}
  </section>;
}
