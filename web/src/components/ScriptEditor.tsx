import './ScriptEditor.css';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Activity, CheckCircle2, ChevronRight, Cloud, Download, FileText, Library, Play, RefreshCw, Save, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { isDeliveryMarkupAligned } from '../domain/deliveryMarkup';
import { getStarterScript, shouldSeedPodcastTemplate } from '../domain/podcastMode';
import { countScriptUnits } from '../domain/sessionMetrics';
import { useMembership } from '../membership/MembershipProvider';
import { useAppStore } from '../store';
import type { Language, PrompterMode } from '../types';
import { getCuratedMaterials, localizePracticeTip } from './localizedMaterials';
import type { ScriptMaterial } from './materials';
import { SessionHistory } from './SessionHistory';
import { usePersonalLibrary } from './usePersonalLibrary';

interface ScriptEditorProps {
  onStart: (title: string, script: string, pace: number, lang: Language, mode: PrompterMode, deliveryMarkup: string) => void;
}

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
    zh: '使用“开场—大纲—结尾”组织播客脚本，由你手动下滑并把握内容进度。',
    en: 'Structure the episode as opening, outline, and closing, then scroll manually to control progress.'
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
  const membership = useMembership();
  const globalLang = useAppStore((state) => state.globalLang);
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
  const [content, setContent] = useState(activeScript || getStarterScript(globalLang, storedMode === 'free'));
  const [tip, setTip] = useState(activeTip);
  const [deliveryMarkup, setDeliveryMarkup] = useState(activeDeliveryMarkup);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const workspaceHydratedRef = useRef(false);
  const isPodcastMode = storedMode === 'free';
  const personalLibrary = usePersonalLibrary(globalLang);

  useEffect(() => {
    if (!isPersistedDataLoaded || workspaceHydratedRef.current) return;
    if (activeTitle) setTitle(activeTitle);
    if (activeScript) setContent(activeScript);
    if (activeTip) setTip(activeTip);
    if (isDeliveryMarkupAligned(activeDeliveryMarkup, activeScript)) setDeliveryMarkup(activeDeliveryMarkup);
    workspaceHydratedRef.current = true;
  }, [activeDeliveryMarkup, activeScript, activeTip, activeTitle, isPersistedDataLoaded]);

  useEffect(() => {
    const zhStarter = getStarterScript('zh', isPodcastMode);
    const enStarter = getStarterScript('en', isPodcastMode);
    if (globalLang === 'en' && content === zhStarter) {
      setContent(enStarter);
      setActiveScript(enStarter);
      setDeliveryMarkup('');
      setActiveDeliveryMarkup('');
      setStoredPace(150);
    } else if (globalLang === 'zh' && content === enStarter) {
      setContent(zhStarter);
      setActiveScript(zhStarter);
      setDeliveryMarkup('');
      setActiveDeliveryMarkup('');
      setStoredPace(220);
    }
  }, [content, globalLang, isPodcastMode, setActiveDeliveryMarkup, setActiveScript, setStoredPace]);

  const unitCount = useMemo(() => countScriptUnits(content, globalLang), [content, globalLang]);
  const estimatedSeconds = isPodcastMode || storedPace <= 0 ? 0 : Math.round((unitCount / storedPace) * 60);
  const hasDeliveryCues = isDeliveryMarkupAligned(deliveryMarkup, content);
  const practiceMaterials = useMemo(() => getCuratedMaterials(globalLang), [globalLang]);
  const displayTip = localizePracticeTip(tip, globalLang);

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

  const selectMode = (nextMode: PrompterMode) => {
    setStoredMode(nextMode);
    if (nextMode !== 'free' || !shouldSeedPodcastTemplate(content)) return;
    const template = getStarterScript(globalLang, true);
    applyMaterialContent(template);
    if (!title.trim()) updateTitle(globalLang === 'zh' ? '我的播客排练' : 'My podcast rehearsal');
  };

  const importMaterial = (material: ScriptMaterial) => {
    updateTitle(material.title);
    applyMaterialContent(material.content, material.deliveryMarkup);
    updateTip(material.tip || '');
    setStoredPace(globalLang === 'zh' ? 220 : 150);
    setIsDrawerOpen(false);
  };

  const openLibrary = () => {
    setIsDrawerOpen(true);
    if (personalLibrary.cloudEnabled) void personalLibrary.refreshCloud();
  };

  const saveDraft = async () => {
    if (!content.trim()) return;
    const fallbackTitle = globalLang === 'zh'
      ? `未命名素材 ${new Date().toLocaleDateString('zh-CN')}`
      : `Untitled material ${new Date().toLocaleDateString('en')}`;
    const draft: ScriptMaterial = {
      id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: title.trim() || fallbackTitle,
      content: content.trim(),
      tip: tip.trim() || undefined,
      deliveryMarkup: hasDeliveryCues ? deliveryMarkup : undefined
    };
    await personalLibrary.save(draft);
    setIsSaving(true);
    window.setTimeout(() => setIsSaving(false), 900);
  };

  const importDrafts = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void personalLibrary.importFile(file).catch((error) => {
      console.error('Failed to import personal library:', error);
      alert(globalLang === 'zh' ? '导入失败：文件格式不正确。' : 'Import failed: invalid file format.');
    });
    event.target.value = '';
  };

  const start = () => {
    if (!content.trim()) return;
    const finalTitle = title.trim() || (globalLang === 'zh'
      ? isPodcastMode ? '未命名播客' : '未命名稿件'
      : isPodcastMode ? 'Untitled podcast' : 'Untitled script');
    const finalContent = content.trim();
    const finalMarkup = isDeliveryMarkupAligned(deliveryMarkup, finalContent) ? deliveryMarkup : '';
    updateTitle(finalTitle);
    setContent(finalContent);
    setActiveScript(finalContent);
    setActiveDeliveryMarkup(finalMarkup);
    onStart(finalTitle, finalContent, storedPace, globalLang, storedMode, finalMarkup);
  };

  const durationLabel = isPodcastMode
    ? (globalLang === 'zh' ? '手动' : 'Manual')
    : `${Math.floor(estimatedSeconds / 60)}:${String(estimatedSeconds % 60).padStart(2, '0')}`;

  return (
    <>
      <button
        type="button"
        className="btn-icon library-launcher"
        onClick={openLibrary}
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
                  <button type="button" className="btn btn-secondary" onClick={personalLibrary.exportFile} disabled={personalLibrary.materials.length === 0}>
                    <Download size={15} /> {globalLang === 'zh' ? '导出' : 'Export'}
                  </button>
                </div>

                <div className="library-section personal-library-section">
                  <div className="personal-library-heading">
                    <h4>{globalLang === 'zh' ? '个人素材库' : 'Personal library'}</h4>
                    {personalLibrary.cloudEnabled ? (
                      <span className="library-cue-tag"><Cloud size={11} /> {globalLang === 'zh' ? 'Pro 云同步' : 'Pro cloud sync'}</span>
                    ) : (
                      <button type="button" className="personal-library-upgrade" onClick={membership.openDialog}>
                        {globalLang === 'zh' ? '升级云同步' : 'Enable cloud sync'}
                      </button>
                    )}
                  </div>
                  <p className="personal-library-note">
                    {personalLibrary.cloudEnabled
                      ? (globalLang === 'zh' ? '文字素材会在线保存并可跨设备同步；录音永远只保存在本机，不会上传。' : 'Text materials sync online across devices. Recordings always stay on this device and are never uploaded.')
                      : (globalLang === 'zh' ? '本机保存免费；RhythmCoach Pro 可在线保存文字素材。录音永远不会上传。' : 'Local saving is free; RhythmCoach Pro adds cloud sync for text materials. Recordings are never uploaded.')}
                  </p>
                  {personalLibrary.cloudEnabled && (
                    <button type="button" className="personal-library-refresh" onClick={() => void personalLibrary.refreshCloud()} disabled={personalLibrary.cloudLoading}>
                      <RefreshCw size={13} /> {personalLibrary.cloudLoading
                        ? (globalLang === 'zh' ? '同步中…' : 'Syncing…')
                        : (globalLang === 'zh' ? '刷新云端' : 'Refresh cloud')}
                    </button>
                  )}
                  {personalLibrary.cloudError && <p className="personal-library-error">{personalLibrary.cloudError}</p>}

                  {personalLibrary.materials.length > 0 ? (
                    <div className="library-list">
                      {personalLibrary.materials.map((material) => (
                        <div key={material.id} className="library-item-row">
                          <button type="button" className="library-item" onClick={() => importMaterial(material)}>
                            <div>
                              <div className="library-item-title">
                                <strong>{material.title}</strong>
                                {personalLibrary.cloudIds.has(material.id) && (
                                  <span className="library-cue-tag"><Cloud size={10} /> {globalLang === 'zh' ? '云端' : 'Cloud'}</span>
                                )}
                              </div>
                              <p>{material.content}</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="btn-icon compact-icon delete-draft"
                            onClick={() => void personalLibrary.remove(material)}
                            aria-label={globalLang === 'zh' ? `删除素材：${material.title}` : `Delete material: ${material.title}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="personal-library-empty">{globalLang === 'zh' ? '还没有个人素材。编辑文字后点击“保存到个人素材库”。' : 'No personal materials yet. Edit a script and choose “Save to personal library.”'}</p>
                  )}
                </div>

                <div className="library-section">
                  <h4>{globalLang === 'zh' ? '精选练习' : 'Practice scripts'}</h4>
                  <div className="library-list">
                    {practiceMaterials.map((material) => (
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
                <span className={`editor-kicker ${globalLang === 'zh' ? 'is-zh' : ''}`}>{globalLang === 'zh' ? '录制前排练工作区' : 'PRE-RECORDING REHEARSAL'}</span>
                <h1 id="editor-title">RhythmCoach</h1>
                <p>{globalLang === 'zh'
                  ? 'RhythmCoach 是演讲者、播客创作者的录制前排练工具。用提纲、提词、录音和可解释的节奏反馈，帮助你减少无效停顿与重复，控制节目时长，并让逐字稿听起来更像自然表达。'
                  : 'RhythmCoach is a pre-recording rehearsal tool for speakers and podcasters. Use outlines, prompting, recording, and explainable pacing feedback to reduce unhelpful pauses and repetition, control duration, and make scripted delivery sound more natural.'}</p>
              </div>
              <span className="workspace-status" aria-live="polite"><CheckCircle2 size={15} /> {globalLang === 'zh' ? '当前稿件已自动保存' : 'Workspace autosaved'}</span>
            </div>

            <label>
              <span className="field-label"><FileText size={16} /> {isPodcastMode
                ? (globalLang === 'zh' ? '播客标题' : 'Episode title')
                : (globalLang === 'zh' ? '稿件标题' : 'Script title')}</span>
              <input
                type="text"
                value={title}
                onChange={(event) => updateTitle(event.target.value)}
                placeholder={isPodcastMode
                  ? (globalLang === 'zh' ? '例如：为什么我们总是高估效率工具' : 'e.g. Why we overestimate productivity tools')
                  : (globalLang === 'zh' ? '例如：60 秒项目介绍' : 'e.g. 60-second project introduction')}
              />
            </label>
            <label className="script-field">
              <span className="field-label">{isPodcastMode
                ? (globalLang === 'zh' ? '播客脚本（开场 / 大纲 / 结尾）' : 'Podcast script (opening / outline / closing)')
                : (globalLang === 'zh' ? '稿件正文' : 'Script')}</span>
              {hasDeliveryCues && (
                <span className="delivery-cue-status">
                  <Sparkles size={13} />
                  <span>{globalLang === 'zh' ? '已附加朗读标注：下划线为重音，轻点为停顿，波纹为换气。编辑正文后将自动关闭。' : 'Delivery cues are active. Editing the script removes them to prevent misalignment.'}</span>
                </span>
              )}
              <textarea
                value={content}
                onChange={(event) => updateContent(event.target.value)}
                placeholder={isPodcastMode
                  ? (globalLang === 'zh' ? '按开场、大纲和结尾组织内容；训练时由你手动下滑。' : 'Organize the episode as opening, outline, and closing; scroll manually during rehearsal.')
                  : undefined}
              />
            </label>
            {displayTip && <div className="practice-tip">💡 {displayTip}</div>}
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
              <div className="summary-tile"><span>{isPodcastMode
                ? (globalLang === 'zh' ? '推进方式' : 'Progress')
                : (globalLang === 'zh' ? '目标时长' : 'Target time')}</span><strong>{durationLabel}</strong></div>
            </div>

            <div className="settings-group">
              <span className="field-label"><Activity size={16} /> {globalLang === 'zh' ? '训练模式' : 'Training mode'}</span>
              <div className="segmented-control">
                {(['timed', 'follow', 'free'] as PrompterMode[]).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    className={`mode-button ${storedMode === mode ? 'active' : ''}`}
                    onClick={() => selectMode(mode)}
                    aria-pressed={storedMode === mode}
                  >
                    {globalLang === 'zh'
                      ? mode === 'timed' ? '定时' : mode === 'follow' ? '跟随' : '播客'
                      : mode === 'timed' ? 'Timed' : mode === 'follow' ? 'Follow' : 'Podcast'}
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

            {!isPodcastMode && (
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
              <button type="button" className="btn btn-secondary" onClick={() => void saveDraft()} disabled={!content.trim()}>
                <Save size={17} /> {isSaving ? (globalLang === 'zh' ? '已保存' : 'Saved') : (globalLang === 'zh' ? '保存到个人素材库' : 'Save to personal library')}
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
