import './ScriptEditor.css';
import { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronRight, Download, FileText, Library, Play, Save, Trash2, Upload, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { countScriptUnits } from '../domain/sessionMetrics';
import { useAppStore } from '../store';
import type { Language, PrompterMode } from '../types';
import { defaultMaterials, type ScriptMaterial } from './materials';
import { SessionHistory } from './SessionHistory';

interface ScriptEditorProps {
  onStart: (title: string, script: string, pace: number, lang: Language, mode: PrompterMode) => void;
}

const ZH_DEFAULT = '大家好，欢迎来到节奏教练。\n\n在这里，你可以选择定时提词、语音跟随或自由演讲。完成练习后，系统会保存本次会话，并与同一稿件的上一次练习进行比较。';
const EN_DEFAULT = 'Hello everyone, welcome to RhythmCoach.\n\nChoose timed prompting, voice-follow prompting, or free speaking. After each rehearsal, the session is saved and compared with your previous attempt on the same script.';
const DRAFTS_KEY = 'rhythm_custom_materials';

const modeCopy: Record<PrompterMode, { zh: string; en: string }> = {
  timed: {
    zh: '按目标总时长连续滚动，适合 60 秒口播、演讲限时和录制排练。',
    en: 'Scrolls continuously to meet the target duration. Best for timed delivery.'
  },
  follow: {
    zh: '讲话时滚动，停顿后暂停。适合跟读、熟稿和节奏稳定训练。',
    en: 'Scrolls while you speak and pauses during silence. Best for guided rehearsal.'
  },
  free: {
    zh: '不自动滚动，由你手动控制。系统记录发声、长停顿和文本进度。',
    en: 'Manual scrolling. RhythmCoach records speech activity, long pauses, and progress.'
  }
};

export function ScriptEditor({ onStart }: ScriptEditorProps) {
  const globalLang = useAppStore((state) => state.globalLang);
  const setGlobalLang = useAppStore((state) => state.setGlobalLang);
  const storedPace = useAppStore((state) => state.targetPace);
  const setStoredPace = useAppStore((state) => state.setTargetPace);
  const storedMode = useAppStore((state) => state.prompterMode);
  const setStoredMode = useAppStore((state) => state.setPrompterMode);
  const audioProfile = useAppStore((state) => state.audioProfile);
  const setAudioProfile = useAppStore((state) => state.setAudioProfile);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState(globalLang === 'zh' ? ZH_DEFAULT : EN_DEFAULT);
  const [tip, setTip] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customMaterials, setCustomMaterials] = useState<ScriptMaterial[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFTS_KEY);
      if (saved) setCustomMaterials(JSON.parse(saved));
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  }, []);

  useEffect(() => {
    if (globalLang === 'en' && content === ZH_DEFAULT) {
      setContent(EN_DEFAULT);
      setStoredPace(150);
    } else if (globalLang === 'zh' && content === EN_DEFAULT) {
      setContent(ZH_DEFAULT);
      setStoredPace(220);
    }
  }, [content, globalLang, setStoredPace]);

  const unitCount = useMemo(() => countScriptUnits(content, globalLang), [content, globalLang]);
  const estimatedSeconds = storedMode === 'free' || storedPace <= 0 ? 0 : Math.round((unitCount / storedPace) * 60);

  const persistDrafts = (drafts: ScriptMaterial[]) => {
    setCustomMaterials(drafts);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  };

  const importMaterial = (material: ScriptMaterial) => {
    setTitle(material.title);
    setContent(material.content);
    setTip(material.tip || '');
    setGlobalLang('zh');
    setStoredPace(220);
    setIsDrawerOpen(false);
  };

  const saveDraft = () => {
    if (!content.trim()) return;
    const draft: ScriptMaterial = {
      id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: title.trim() || `未命名草稿 ${new Date().toLocaleDateString()}`,
      content: content.trim(),
      tip: tip.trim() || undefined
    };
    persistDrafts([draft, ...customMaterials]);
    setIsSaving(true);
    window.setTimeout(() => setIsSaving(false), 900);
  };

  const exportDrafts = () => {
    if (customMaterials.length === 0) return;
    const blob = new Blob([JSON.stringify(customMaterials, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rhythmcoach_drafts_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importDrafts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error('Expected an array');
        const valid = parsed
          .filter((item) => item && typeof item.title === 'string' && typeof item.content === 'string')
          .map((item) => ({
            id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            title: item.title,
            content: item.content,
            tip: typeof item.tip === 'string' ? item.tip : undefined
          }));
        persistDrafts([...valid, ...customMaterials]);
      } catch (error) {
        console.error('Failed to import drafts:', error);
        alert(globalLang === 'zh' ? '导入失败：文件格式不正确。' : 'Import failed: invalid file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const start = () => {
    if (!content.trim()) return;
    onStart(title.trim() || (globalLang === 'zh' ? '未命名稿件' : 'Untitled script'), content.trim(), storedPace, globalLang, storedMode);
  };

  const durationLabel = storedMode === 'free'
    ? '--:--'
    : `${Math.floor(estimatedSeconds / 60)}:${String(estimatedSeconds % 60).padStart(2, '0')}`;

  return (
    <>
      <button
        className="btn-icon"
        onClick={() => setIsDrawerOpen(true)}
        style={{ position: 'fixed', left: 20, top: 20, zIndex: 90, width: 48, height: 48, background: 'var(--bg-panel)' }}
        title={globalLang === 'zh' ? '素材库' : 'Script library'}
      >
        <Library size={22} />
      </button>

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.62)' }}
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="glass-panel"
              style={{ position: 'fixed', inset: '0 auto 0 0', zIndex: 110, width: 'min(390px, 92vw)', borderRadius: '0 24px 24px 0', padding: 0, overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderBottom: '1px solid var(--glass-border)' }}>
                <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Library size={19} /> {globalLang === 'zh' ? '素材库' : 'Library'}</strong>
                <button className="btn-icon" onClick={() => setIsDrawerOpen(false)} style={{ width: 32, height: 32, padding: 0 }}><X size={17} /></button>
              </div>
              <div style={{ height: 'calc(100vh - 77px)', overflowY: 'auto', padding: 16 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                  <button className="btn btn-secondary" onClick={() => document.getElementById('draft-import')?.click()} style={{ flex: 1, padding: 10, justifyContent: 'center', fontSize: '.82rem' }}>
                    <Upload size={15} /> {globalLang === 'zh' ? '导入' : 'Import'}
                  </button>
                  <input id="draft-import" type="file" accept="application/json,.json" hidden onChange={importDrafts} />
                  <button className="btn btn-secondary" onClick={exportDrafts} style={{ flex: 1, padding: 10, justifyContent: 'center', fontSize: '.82rem' }}>
                    <Download size={15} /> {globalLang === 'zh' ? '导出' : 'Export'}
                  </button>
                </div>

                {customMaterials.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 6px' }}>{globalLang === 'zh' ? '我的草稿' : 'My drafts'}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {customMaterials.map((material) => (
                        <div key={material.id} className="library-item" onClick={() => importMaterial(material)}>
                          <div style={{ minWidth: 0 }}>
                            <strong>{material.title}</strong>
                            <p>{material.content}</p>
                          </div>
                          <button
                            className="btn-icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              persistDrafts(customMaterials.filter((item) => item.id !== material.id));
                            }}
                            style={{ width: 28, height: 28, padding: 0, color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 6px' }}>{globalLang === 'zh' ? '精选练习' : 'Practice scripts'}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {defaultMaterials.map((material) => (
                    <div key={material.id} className="library-item" onClick={() => importMaterial(material)}>
                      <div style={{ minWidth: 0 }}>
                        <strong>{material.title}</strong>
                        <p>{material.content}</p>
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main style={{ width: 'min(1200px, 92vw)', margin: '60px auto 80px' }}>
        <div className="editor-layout" style={{ alignItems: 'stretch' }}>
          <section className="glass-panel" style={{ padding: 34, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2.2rem' }}>RhythmCoach</h1>
              <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>
                {globalLang === 'zh' ? '把一次口播变成可复盘、可比较的训练。' : 'Turn every rehearsal into measurable progress.'}
              </p>
            </div>
            <label>
              <span className="field-label"><FileText size={16} /> {globalLang === 'zh' ? '稿件标题' : 'Script title'}</span>
              <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={globalLang === 'zh' ? '例如：60 秒项目介绍' : 'e.g. 60-second project introduction'} />
            </label>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span className="field-label">{globalLang === 'zh' ? '稿件正文' : 'Script'}</span>
              <textarea value={content} onChange={(event) => setContent(event.target.value)} style={{ minHeight: 360, flex: 1 }} />
            </label>
            {tip && <div className="practice-tip">💡 {tip}</div>}
          </section>

          <section className="glass-panel" style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="summary-tile"><span>{globalLang === 'zh' ? '有效字数' : 'Words'}</span><strong>{unitCount}</strong></div>
              <div className="summary-tile"><span>{globalLang === 'zh' ? '目标时长' : 'Target time'}</span><strong>{durationLabel}</strong></div>
            </div>

            <div>
              <span className="field-label"><Activity size={16} /> {globalLang === 'zh' ? '训练模式' : 'Training mode'}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(['timed', 'follow', 'free'] as PrompterMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`mode-button ${storedMode === mode ? 'active' : ''}`}
                    onClick={() => setStoredMode(mode)}
                  >
                    {globalLang === 'zh'
                      ? mode === 'timed' ? '定时' : mode === 'follow' ? '跟随' : '自由'
                      : mode === 'timed' ? 'Timed' : mode === 'follow' ? 'Follow' : 'Free'}
                  </button>
                ))}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '.84rem', lineHeight: 1.55, margin: '10px 2px 0' }}>{modeCopy[storedMode][globalLang]}</p>
            </div>

            <div>
              <span className="field-label">{globalLang === 'zh' ? '录音声音' : 'Recording sound'}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(['raw', 'podcast', 'broadcast'] as const).map((profile) => (
                  <button
                    key={profile}
                    className={`mode-button ${audioProfile === profile ? 'active' : ''}`}
                    onClick={() => setAudioProfile(profile)}
                  >
                    {globalLang === 'zh'
                      ? profile === 'raw' ? '原始' : profile === 'podcast' ? '播客' : '清晰'
                      : profile === 'raw' ? 'Raw' : profile === 'podcast' ? 'Podcast' : 'Crisp'}
                  </button>
                ))}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '.78rem', lineHeight: 1.5, margin: '9px 2px 0' }}>
                {globalLang === 'zh' ? '音频配置在训练开始时锁定，避免练习中断或录音被拆分。' : 'The audio profile is locked when the session starts to prevent recording interruptions.'}
              </p>
            </div>

            {storedMode !== 'free' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="field-label" style={{ margin: 0 }}>{globalLang === 'zh' ? '目标语速' : 'Target pace'}</span>
                  <strong style={{ color: 'var(--accent-primary)' }}>{storedPace} {globalLang === 'zh' ? 'CPM' : 'WPM'}</strong>
                </div>
                <input type="range" min={globalLang === 'zh' ? 100 : 70} max={globalLang === 'zh' ? 350 : 240} value={storedPace} onChange={(event) => setStoredPace(Number(event.target.value))} />
                <p style={{ color: 'var(--text-muted)', fontSize: '.78rem', lineHeight: 1.5, marginTop: 9 }}>
                  {globalLang === 'zh' ? '这是滚动目标，不会被冒充为实时测得语速。完成后才会给出“进度估算语速”。' : 'This controls scrolling. It is not presented as measured pace; an estimated pace is calculated after the session.'}
                </p>
              </div>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-secondary" onClick={saveDraft} disabled={!content.trim()} style={{ justifyContent: 'center' }}>
                <Save size={17} /> {isSaving ? (globalLang === 'zh' ? '已保存' : 'Saved') : (globalLang === 'zh' ? '保存草稿' : 'Save draft')}
              </button>
              <button className="btn" onClick={start} disabled={!content.trim()} style={{ justifyContent: 'center' }}>
                <Play size={18} fill="currentColor" /> {globalLang === 'zh' ? '开始训练' : 'Start rehearsal'}
              </button>
            </div>
          </section>
        </div>

        <SessionHistory title={title || (globalLang === 'zh' ? '未命名稿件' : 'Untitled script')} script={content} lang={globalLang} />
      </main>
    </>
  );
}
