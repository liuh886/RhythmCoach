import './ScriptEditor.css';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Activity, CheckCircle2, ChevronRight, Download, FileText, Library, Play, Save, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { isDeliveryMarkupAligned } from '../domain/deliveryMarkup';
import { countScriptUnits } from '../domain/sessionMetrics';
import { useAppStore } from '../store';
import type { Language, PrompterMode } from '../types';
import { defaultMaterials, type ScriptMaterial } from './materials';
import { SessionHistory } from './SessionHistory';

interface ScriptEditorProps {
  onStart: (title: string, script: string, pace: number, lang: Language, mode: PrompterMode, deliveryMarkup: string) => void;
}

const ZH_DEFAULT = '大家好，欢迎来到节奏教练。\n\n在这里，你可以选择定时提词、语音跟随或自由演讲。完成练习后，系统会保存本次会话，并与同一稿件的上一次练习进行比较。';
const EN_DEFAULT = 'Hello everyone, welcome to RhythmCoach.\n\nChoose timed prompting, voice-follow prompting, or free speaking. After each rehearsal, the session is saved and compared with your previous attempt on the same script.';
const DRAFTS_KEY = 'rhythm_custom_materials';

const modeCopy: Record<PrompterMode, { zh: string; en: string }> = {
  timed: {
    zh: '按目标总时长连续滚动，并在正文旁显示时间标尺。',
    en: 'Scrolls to the target duration with a timeline aligned to the script.'
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

const audioProfileCopy = {
  raw: {
    zh: '自然动态，不做额外 EQ 或压缩。',
    en: 'Natural dynamics with no additional EQ or compression.'
  },
  podcast: {
    zh: '温和清理停顿底噪，并增强日常口播清晰度。',
    en: 'Gentle pause cleanup and clarity for everyday spoken delivery.'
  },
  broadcast: {
    zh: '更清晰、更紧凑，并加入更强的停顿降噪与峰值保护。',
    en: 'A tighter sound with stronger pause cleanup and peak protection.'
  }
} as const;

export function ScriptEditor({ onStart }: ScriptEditorProps) {
  const globalLang = useAppStore((state) => state.globalLang);
  const setGlobalLang = useAppStore((state) => state.setGlobalLang);
  const storedPace = useAppStore((state) => state.targetPace);
  const setStoredPace = useAppStore((state) => state.setTargetPace);
  const storedMode = useAppStore((state) => state.prompterMode);
  const setStoredMode = useAppStore((state) => state.setPrompterMode);
  const audioProfile = useAppStore((state) => state.audioProfile);
  const setAudioProfile = useAppStore((state) => state.setAudioProfile);
  const activeTitle = useAppStore((state) => state.activeTitle);
  const activeScript = useAppStore((state) => state.activeScript);
  const activeTip = useAppStore((state) => state.activeTip);
  const activeDeliveryMarkup = useAppStore((state) => state.activeDeliveryMarkup);
  const setActiveTitle = useAppStore((state) => state.setActiveTitle);
  const setActiveScript = useAppStore((state) => state.setActiveScript);
  const setActiveTip = useAppStore((state) => state.setActiveTip);
  const setActiveDeliveryMarkup = useAppStore((state) => state.setActiveDeliveryMarkup);
  const isPersistedDataLoaded = useAppStore((state) => state.isPersistedDataLoaded);

  const [title, setTitle] = useState(activeTitle);
  const [content, setContent] = useState(activeScript || (globalLang === 'zh' ? ZH_DEFAULT : EN_DEFAULT));
  const [tip, setTip] = useState(activeTip);
  const [deliveryMarkup, setDeliveryMarkup] = useState(activeDeliveryMarkup);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customMaterials, setCustomMaterials] = useState<ScriptMaterial[]>([]);
  const workspaceHydratedRef = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFTS_KEY);
      if (saved) setCustomMaterials(JSON.parse(saved));
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  }, []);

  useEffect(() => {
    if (!isPersistedDataLoaded || workspaceHydratedRef.current) return;
    if (activeTitle) setTitle(activeTitle);
    if (activeScript) setContent(activeScript);
    if (activeTip) setTip(activeTip);
    if (isDeliveryMarkupAligned(activeDeliveryMarkup, activeScript)) setDeliveryMarkup(activeDeliveryMarkup);
    workspaceHydratedRef.current = true;
  }, [activeDeliveryMarkup, activeScript, activeTip, activeTitle, isPersistedDataLoaded]);

  useEffect(() => {
    if (globalLang === 'en' && content === ZH_DEFAULT) {
      setContent(EN_DEFAULT);
      setActiveScript(EN_DEFAULT);
      setDeliveryMarkup('');
      setActiveDeliveryMarkup('');
      setStoredPace(150);
    } else if (globalLang === 'zh' && content === EN_DEFAULT) {
      setContent(ZH_DEFAULT);
      setActiveScript(ZH_DEFAULT);
      setDeliveryMarkup('');
      setActiveDeliveryMarkup('');
      setStoredPace(220);
    }
  }, [content, globalLang, setActiveDeliveryMarkup, setActiveScript, setStoredPace]);

  const unitCount = useMemo(() => countScriptUnits(content, globalLang), [content, globalLang]);
  const estimatedSeconds = storedMode === 'free' || storedPace <= 0 ? 0 : Math.round((unitCount / storedPace) * 60);
  const hasDeliveryCues = isDeliveryMarkupAligned(deliveryMarkup, content);

  const updateTitle = (value: string) => {
    setTitle(value);
    setActiveTitle(value);
  };

  const updateContent = (value: string) => {
    setContent(value);
    setActiveScript(value);
    if (deliveryMarkup) {
      setDeliveryMarkup('');
      setActiveDeliveryMarkup('');
    }
  };

  const applyMaterialContent = (value: string, markup = '') => {
    setContent(value);
    setActiveScript(value);
    const alignedMarkup = isDeliveryMarkupAligned(markup, value) ? markup : '';
    setDeliveryMarkup(alignedMarkup);
    setActiveDeliveryMarkup(alignedMarkup);
  };

  const updateTip = (value: string) => {
    setTip(value);
    setActiveTip(value);
  };

  const persistDrafts = (drafts: ScriptMaterial[]) => {
    setCustomMaterials(drafts);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  };

  const importMaterial = (material: ScriptMaterial) => {
    updateTitle(material.title);
    applyMaterialContent(material.content, material.deliveryMarkup);
    updateTip(material.tip || '');
    setGlobalLang('zh');
    setStoredPace(220);
    setIsDrawerOpen(false);
  };

  const saveDraft = () => {
    if (!content.trim()) return;
    const fallbackTitle = globalLang === 'zh'
      ? `未命名草稿 ${new Date().toLocaleDateString('zh-CN')}`
      : `Untitled draft ${new Date().toLocaleDateString('en')}`;
    const draft: ScriptMaterial = {
      id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: title.trim() || fallbackTitle,
      content: content.trim(),
      tip: tip.trim() || undefined,
      deliveryMarkup: hasDeliveryCues ? deliveryMarkup : undefined
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

  const importDrafts = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error('Expected an array');
        const valid = parsed
          .filter((item) => item && typeof item.title === 'string' && typeof item.content === 'string')
          .map((item) => {
            const markup = typeof item.deliveryMarkup === 'string' && isDeliveryMarkupAligned(item.deliveryMarkup, item.content)
              ? item.deliveryMarkup
              : undefined;
            return {
              id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
              title: item.title,
              content: item.content,
              tip: typeof item.tip === 'string' ? item.tip : undefined,
              deliveryMarkup: markup
            };
          });
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
    const finalTitle = title.trim() || (globalLang === 'zh' ? '未命名稿件' : 'Untitled script');
    const finalContent = content.trim();
    const finalMarkup = isDeliveryMarkupAligned(deliveryMarkup, finalContent) ? deliveryMarkup : '';
    updateTitle(finalTitle);
    setContent(finalContent);
    setActiveScript(finalContent);
    setActiveDeliveryMarkup(finalMarkup);
    onStart(finalTitle, finalContent, storedPace, globalLang, storedMode, finalMarkup);
  };

  const durationLabel = storedMode === 'free'
    ? '--:--'
    : `${Math.floor(estimatedSeconds / 60)}:${String(estimatedSeconds % 60).padStart(2, '0')}`;

  return (
    <>
      <button
        type="button"
        className="btn-icon library-launcher"
        onClick={() => setIsDrawerOpen(true)}
        title={globalLang === 'zh' ? '素材库' : 'Script library'}
        aria-label={globalLang === 'zh' ? '打开素材库' : 'Open script library'}
      >
        <Library size={21} />
      </button>

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              className="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="glass-panel library-drawer"
              aria-label={globalLang === 'zh' ? '素材库' : 'Script library'}
            >
              <div className="library-drawer-header">
                <strong><Library size={19} /> {globalLang === 'zh' ? '素材库' : 'Library'}</strong>
                <button
                  type="button"
                  className="btn-icon compact-icon"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label={globalLang === 'zh' ? '关闭素材库' : 'Close script library'}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="library-drawer-content">
                <div className="library-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => document.getElementById('draft-import')?.click()}>
                    <Upload size={15} /> {globalLang === 'zh' ? '导入' : 'Import'}
                  </button>
                  <input id="draft-import" type="file" accept="application/json,.json" hidden onChange={importDrafts} />
                  <button type="button" className="btn btn-secondary" onClick={exportDrafts} disabled={customMaterials.length === 0}>
                    <Download size={15} /> {globalLang === 'zh' ? '导出' : 'Export'}
                  </button>
                </div>

                {customMaterials.length > 0 && (
                  <div className="library-section">
                    <h4>{globalLang === 'zh' ? '我的草稿' : 'My drafts'}</h4>
                    <div className="library-list">
                      {customMaterials.map((material) => (
                        <div key={material.id} className="library-item-row">
                          <button type="button" className="library-item" onClick={() => importMaterial(material)}>
                            <div>
                              <strong>{material.title}</strong>
                              <p>{material.content}</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="btn-icon compact-icon delete-draft"
                            onClick={() => persistDrafts(customMaterials.filter((item) => item.id !== material.id))}
                            aria-label={globalLang === 'zh' ? `删除草稿：${material.title}` : `Delete draft: ${material.title}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="library-section">
                  <h4>{globalLang === 'zh' ? '精选练习' : 'Practice scripts'}</h4>
                  <div className="library-list">
                    {defaultMaterials.map((material) => (
                      <button type="button" key={material.id} className="library-item" onClick={() => importMaterial(material)}>
                        <div>
                          <div className="library-item-title">
                            <strong>{material.title}</strong>
                            <span className="library-cue-tag"><Sparkles size={11} /> {globalLang === 'zh' ? '朗读标注' : 'Delivery cues'}</span>
                          </div>
                          <p>{material.content}</p>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="editor-page">
        <div className="editor-layout">
          <section className="glass-panel editor-script-panel" aria-labelledby="editor-title">
            <div className="editor-hero">
              <div>
                <span className={`editor-kicker ${globalLang === 'zh' ? 'is-zh' : ''}`}>{globalLang === 'zh' ? '口播工作区' : 'REHEARSAL WORKSPACE'}</span>
                <h1 id="editor-title">RhythmCoach</h1>
                <p>{globalLang === 'zh' ? '把一次口播变成可复盘、可比较的训练。' : 'Turn every rehearsal into measurable progress.'}</p>
              </div>
              <span className="workspace-status" aria-live="polite"><CheckCircle2 size={15} /> {globalLang === 'zh' ? '当前稿件已自动保存' : 'Workspace autosaved'}</span>
            </div>

            <label>
              <span className="field-label"><FileText size={16} /> {globalLang === 'zh' ? '稿件标题' : 'Script title'}</span>
              <input type="text" value={title} onChange={(event) => updateTitle(event.target.value)} placeholder={globalLang === 'zh' ? '例如：60 秒项目介绍' : 'e.g. 60-second project introduction'} />
            </label>
            <label className="script-field">
              <span className="field-label">{globalLang === 'zh' ? '稿件正文' : 'Script'}</span>
              {hasDeliveryCues && (
                <span className="delivery-cue-status">
                  <Sparkles size={13} />
                  <span>{globalLang === 'zh' ? '已附加朗读标注：下划线为重音，轻点为停顿，波纹为换气。编辑正文后将自动关闭。' : 'Delivery cues are active. Editing the script removes them to prevent misalignment.'}</span>
                </span>
              )}
              <textarea value={content} onChange={(event) => updateContent(event.target.value)} />
            </label>
            {tip && <div className="practice-tip">💡 {tip}</div>}
          </section>

          <section className="glass-panel editor-controls-panel" aria-labelledby="session-setup-title">
            <div className="controls-heading">
              <div>
                <span className={`editor-kicker ${globalLang === 'zh' ? 'is-zh' : ''}`}>{globalLang === 'zh' ? '训练配置' : 'SESSION SETUP'}</span>
                <h2 id="session-setup-title">{globalLang === 'zh' ? '训练设置' : 'Rehearsal setup'}</h2>
              </div>
              <Activity size={20} />
            </div>

            <div className="summary-row">
              <div className="summary-tile"><span>{globalLang === 'zh' ? '有效字数' : 'Words'}</span><strong>{unitCount}</strong></div>
              <div className="summary-tile"><span>{globalLang === 'zh' ? '目标时长' : 'Target time'}</span><strong>{durationLabel}</strong></div>
            </div>

            <div className="settings-group">
              <span className="field-label"><Activity size={16} /> {globalLang === 'zh' ? '训练模式' : 'Training mode'}</span>
              <div className="segmented-control">
                {(['timed', 'follow', 'free'] as PrompterMode[]).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    className={`mode-button ${storedMode === mode ? 'active' : ''}`}
                    onClick={() => setStoredMode(mode)}
                    aria-pressed={storedMode === mode}
                  >
                    {globalLang === 'zh'
                      ? mode === 'timed' ? '定时' : mode === 'follow' ? '跟随' : '自由'
                      : mode === 'timed' ? 'Timed' : mode === 'follow' ? 'Follow' : 'Free'}
                  </button>
                ))}
              </div>
              <p className="setting-help">{modeCopy[storedMode][globalLang]}</p>
            </div>

            <div className="settings-group">
              <span className="field-label">{globalLang === 'zh' ? '录音风格' : 'Recording style'}</span>
              <div className="segmented-control">
                {(['raw', 'podcast', 'broadcast'] as const).map((profile) => (
                  <button
                    type="button"
                    key={profile}
                    className={`mode-button ${audioProfile === profile ? 'active' : ''}`}
                    onClick={() => setAudioProfile(profile)}
                    aria-pressed={audioProfile === profile}
                  >
                    {globalLang === 'zh'
                      ? profile === 'raw' ? '自然' : profile === 'podcast' ? '播客' : '清晰'
                      : profile === 'raw' ? 'Natural' : profile === 'podcast' ? 'Podcast' : 'Crisp'}
                  </button>
                ))}
              </div>
              <p className="setting-help compact">{audioProfileCopy[audioProfile][globalLang]}</p>
            </div>

            {storedMode !== 'free' && (
              <div className="settings-group pace-setting">
                <div className="pace-setting-header">
                  <span className="field-label">{globalLang === 'zh' ? '目标语速' : 'Target pace'}</span>
                  <strong>{storedPace} {globalLang === 'zh' ? 'CPM' : 'WPM'}</strong>
                </div>
                <input
                  type="range"
                  min={globalLang === 'zh' ? 100 : 70}
                  max={globalLang === 'zh' ? 350 : 240}
                  value={storedPace}
                  onChange={(event) => setStoredPace(Number(event.target.value))}
                  aria-label={globalLang === 'zh' ? '目标语速' : 'Target pace'}
                />
                <p className="setting-help compact">
                  {globalLang === 'zh' ? '它控制滚动与时间标尺，不会被冒充为实时测得语速。' : 'This controls scrolling and the timeline; it is not presented as measured pace.'}
                </p>
              </div>
            )}

            <div className="editor-actions">
              <button type="button" className="btn btn-secondary" onClick={saveDraft} disabled={!content.trim()}>
                <Save size={17} /> {isSaving ? (globalLang === 'zh' ? '已保存' : 'Saved') : (globalLang === 'zh' ? '保存到素材库' : 'Save to library')}
              </button>
              <button type="button" className="btn" onClick={start} disabled={!content.trim()}>
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
