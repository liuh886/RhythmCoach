import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Languages,
  Mic2,
  Moon,
  Pause,
  Play,
  ShieldCheck,
  Sun,
  Timer
} from 'lucide-react';
import type { AppTheme } from '../domain/theme';
import type { Language } from '../types';
import './LandingPage.css';

interface LandingPageProps {
  lang: Language;
  theme: AppTheme;
  onOpenApp: () => void;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
}

const copy = {
  zh: {
    navigation: '首页导航',
    product: '演讲与播客录制前排练',
    workflow: '工作方式',
    github: 'GitHub',
    openApp: '打开应用',
    heroLead: '先把表达练稳，',
    heroAccent: '再开始正式录制。',
    heroBody: 'RhythmCoach 把提纲、提词、录音与节奏反馈放进一次排练里。帮助演讲者和播客创作者在按下录制键之前，发现停顿、失速与超时。',
    explore: '看看如何工作',
    trust: '本地优先 · 无需账户 · 音频不自动上传',
    mockTitle: '我的播客排练',
    podcastMode: '播客训练',
    targetTime: '目标时长',
    targetPace: '目标语速',
    opening: '开场',
    openingText: '今天我想分享一个最近反复出现的观察。',
    outline: '大纲',
    outlineText: '为什么重要 · 一个真实例子 · 可以采取的行动',
    closing: '结尾',
    closingText: '把观点收回来，留下一个清晰的问题。',
    startRehearsal: '开始排练',
    workflowTitle: '不是照着稿子念。是把稿子练成自然表达。',
    workflowBody: '用“开场—大纲—结尾”组织播客，也可以按目标时长自动提词，或让文本跟随你的声音。你负责表达，界面只保留当下真正需要的信息。',
    modeTimed: '定时提词',
    modeFollow: '语音跟随',
    modePodcast: '播客训练',
    recording: '正在录音',
    elapsed: '已用 02:18',
    total: '目标 05:00',
    prompterText1: '真正自然的表达，不是把每个字都念对。',
    prompterText2: '而是知道哪里应该停，哪里应该推进，哪里需要把重点交给听众。',
    feedbackTitle: '每次只改一个最重要的问题。',
    feedbackBody: '训练结束后查看实际用时、发声占比、长停顿、完成度与整体估算语速。反馈会解释为什么重要，并给出下一次可以立即执行的重点。',
    duration: '实际用时',
    voiceRatio: '发声占比',
    longPauses: '长停顿',
    completion: '完成度',
    focusLabel: '下一次训练重点',
    focus: '先缩短段落之间的长停顿，再调整语速。这样更容易让整段表达保持连续。',
    finalTitle: '下一次录制之前，先完整练一遍。',
    finalBody: '从一段稿子开始，不需要账户，也不需要上传音频。',
    backToTop: '返回顶部',
    language: 'Switch to English',
    lightTheme: '切换到白色模式',
    darkTheme: '切换到深色模式'
  },
  en: {
    navigation: 'Homepage navigation',
    product: 'Pre-recording rehearsal for speakers and podcasters',
    workflow: 'How it works',
    github: 'GitHub',
    openApp: 'Open app',
    heroLead: 'Rehearse the delivery.',
    heroAccent: 'Then press record.',
    heroBody: 'RhythmCoach brings outlines, prompting, recording, and pacing feedback into one rehearsal. Speakers and podcasters can catch pauses, rushed passages, and timing problems before the real take.',
    explore: 'See how it works',
    trust: 'Local-first · No account · No automatic audio upload',
    mockTitle: 'My podcast rehearsal',
    podcastMode: 'Podcast rehearsal',
    targetTime: 'Target time',
    targetPace: 'Target pace',
    opening: 'Opening',
    openingText: 'Today I want to share an observation that keeps returning.',
    outline: 'Outline',
    outlineText: 'Why it matters · A real example · One practical action',
    closing: 'Closing',
    closingText: 'Bring the idea back and leave one clear question.',
    startRehearsal: 'Start rehearsal',
    workflowTitle: 'Do not read the script. Rehearse it into natural delivery.',
    workflowBody: 'Structure a podcast as opening, outline, and closing. Or prompt to a target duration and let the script follow your voice. You focus on delivery; the interface keeps only what matters now.',
    modeTimed: 'Timed prompt',
    modeFollow: 'Voice follow',
    modePodcast: 'Podcast',
    recording: 'Recording',
    elapsed: 'Elapsed 02:18',
    total: 'Target 05:00',
    prompterText1: 'Natural delivery is not about pronouncing every word perfectly.',
    prompterText2: 'It is knowing where to pause, where to move forward, and where to give the idea room to land.',
    feedbackTitle: 'Improve one important thing at a time.',
    feedbackBody: 'Review actual duration, voice ratio, long pauses, completion, and estimated pace after each rehearsal. The feedback explains why it matters and gives you one concrete focus for the next run.',
    duration: 'Duration',
    voiceRatio: 'Voice ratio',
    longPauses: 'Long pauses',
    completion: 'Completion',
    focusLabel: 'Next rehearsal focus',
    focus: 'Shorten the long pauses between sections before changing pace. That will make the whole delivery feel more continuous.',
    finalTitle: 'Run one complete rehearsal before the next recording.',
    finalBody: 'Start with a script. No account and no audio upload required.',
    backToTop: 'Back to top',
    language: '切换到中文',
    lightTheme: 'Switch to light mode',
    darkTheme: 'Switch to dark mode'
  }
} as const;

function scrollToWorkflow() {
  document.getElementById('landing-workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function LandingPage({
  lang,
  theme,
  onOpenApp,
  onToggleLanguage,
  onToggleTheme
}: LandingPageProps) {
  const text = copy[lang];
  const themeLabel = theme === 'dark' ? text.lightTheme : text.darkTheme;

  return (
    <div className="landing-page">
      <header className="landing-header">
        <nav className="landing-nav" aria-label={text.navigation}>
          <a className="landing-brand" href="#/" aria-label="RhythmCoach">
            <img src="./rhythmcoach.svg" alt="" width="40" height="40" />
            <span>
              <strong>RhythmCoach</strong>
              <small>{text.product}</small>
            </span>
          </a>

          <div className="landing-nav-actions">
            <button type="button" className="landing-nav-link landing-desktop-action" onClick={scrollToWorkflow}>
              {text.workflow}
            </button>
            <a
              className="landing-nav-link landing-desktop-action"
              href="https://github.com/liuh886/RhythmCoach"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={16} /> {text.github}
            </a>
            <button type="button" className="landing-icon-button" onClick={onToggleTheme} aria-label={themeLabel} title={themeLabel}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" className="landing-language-button" onClick={onToggleLanguage} aria-label={text.language} title={text.language}>
              <Languages size={17} />
              <span>{lang === 'zh' ? 'EN' : '中'}</span>
            </button>
            <button type="button" className="landing-open-button" onClick={onOpenApp}>
              {text.openApp} <ArrowRight size={16} />
            </button>
          </div>
        </nav>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <h1 id="landing-title">
              <span>{text.heroLead}</span>
              <span className="landing-gradient-text">{text.heroAccent}</span>
            </h1>
            <p>{text.heroBody}</p>
            <div className="landing-hero-actions">
              <button type="button" className="landing-primary-cta" onClick={onOpenApp}>
                {text.openApp} <ArrowRight size={18} />
              </button>
              <button type="button" className="landing-secondary-cta" onClick={scrollToWorkflow}>
                {text.explore}
              </button>
            </div>
            <div className="landing-trust-line">
              <ShieldCheck size={16} /> {text.trust}
            </div>
          </div>

          <div className="landing-window landing-editor-window" aria-label={lang === 'zh' ? 'RhythmCoach 脚本准备界面预览' : 'RhythmCoach script preparation preview'}>
            <div className="landing-window-bar">
              <div className="landing-window-dots" aria-hidden="true"><span /><span /><span /></div>
              <strong>RhythmCoach</strong>
              <span className="landing-window-status"><span /> Local</span>
            </div>
            <div className="landing-editor-layout">
              <div className="landing-editor-main">
                <div className="landing-editor-heading">
                  <div>
                    <span>{text.podcastMode}</span>
                    <h2>{text.mockTitle}</h2>
                  </div>
                  <div className="landing-editor-summary">
                    <div><Timer size={15} /><span>{text.targetTime}</span><strong>08:42</strong></div>
                    <div><Activity size={15} /><span>{text.targetPace}</span><strong>{lang === 'zh' ? '220 字/分' : '150 wpm'}</strong></div>
                  </div>
                </div>
                <div className="landing-script-block">
                  <span>{text.opening}</span>
                  <p>{text.openingText}</p>
                </div>
                <div className="landing-script-block landing-script-block-active">
                  <span>{text.outline}</span>
                  <p>{text.outlineText}</p>
                </div>
                <div className="landing-script-block">
                  <span>{text.closing}</span>
                  <p>{text.closingText}</p>
                </div>
              </div>
              <aside className="landing-editor-side">
                <div className="landing-mode-switch">
                  <button type="button">{text.modeTimed}</button>
                  <button type="button">{text.modeFollow}</button>
                  <button type="button" className="active">{text.modePodcast}</button>
                </div>
                <div className="landing-audio-card">
                  <div className="landing-audio-icon"><Mic2 size={19} /></div>
                  <div><span>Audio</span><strong>Podcast</strong></div>
                  <div className="landing-audio-wave" aria-hidden="true"><span /><span /><span /><span /><span /></div>
                </div>
                <button type="button" className="landing-preview-start" onClick={onOpenApp}>
                  <Play size={17} fill="currentColor" /> {text.startRehearsal}
                </button>
              </aside>
            </div>
          </div>
        </section>

        <section className="landing-feature-section landing-workflow-section" id="landing-workflow" aria-labelledby="workflow-title">
          <div className="landing-section-copy">
            <h2 id="workflow-title">{text.workflowTitle}</h2>
            <p>{text.workflowBody}</p>
            <div className="landing-mode-list" aria-label={lang === 'zh' ? '训练模式' : 'Rehearsal modes'}>
              <span><CheckCircle2 size={15} /> {text.modeTimed}</span>
              <span><CheckCircle2 size={15} /> {text.modeFollow}</span>
              <span><CheckCircle2 size={15} /> {text.modePodcast}</span>
            </div>
          </div>

          <div className="landing-window landing-prompter-window" aria-label={lang === 'zh' ? 'RhythmCoach 提词界面预览' : 'RhythmCoach prompting preview'}>
            <div className="landing-prompter-topbar">
              <div className="landing-recording-state"><span /><Mic2 size={15} /> {text.recording}</div>
              <div className="landing-prompter-time"><span>{text.elapsed}</span><strong>02:18</strong><span>{text.total}</span></div>
              <button type="button" aria-label={lang === 'zh' ? '暂停' : 'Pause'}><Pause size={16} fill="currentColor" /></button>
            </div>
            <div className="landing-prompter-body">
              <div className="landing-time-rail" aria-hidden="true">
                <span>02:00</span><i /><span>03:00</span><i /><span>04:00</span>
              </div>
              <div className="landing-prompter-copy">
                <p>{text.prompterText1}</p>
                <p className="active">{text.prompterText2}</p>
                <p aria-hidden="true">{lang === 'zh' ? '让句子听起来像你真正想说的话。' : 'Make the sentence sound like something you truly mean.'}</p>
              </div>
            </div>
            <div className="landing-progress-track"><span /></div>
          </div>
        </section>

        <section className="landing-feature-section landing-feedback-section" aria-labelledby="feedback-title">
          <div className="landing-window landing-feedback-window" aria-label={lang === 'zh' ? 'RhythmCoach 训练反馈预览' : 'RhythmCoach rehearsal feedback preview'}>
            <div className="landing-feedback-head">
              <div>
                <span>{lang === 'zh' ? '本次排练' : 'Latest rehearsal'}</span>
                <h3>{text.mockTitle}</h3>
              </div>
              <BarChart3 size={22} />
            </div>
            <div className="landing-metrics-grid">
              <div><Timer size={17} /><span>{text.duration}</span><strong>05:12</strong></div>
              <div><Activity size={17} /><span>{text.voiceRatio}</span><strong>78%</strong></div>
              <div><Pause size={17} /><span>{text.longPauses}</span><strong>3</strong></div>
              <div><CheckCircle2 size={17} /><span>{text.completion}</span><strong>94%</strong></div>
            </div>
            <div className="landing-focus-card">
              <div className="landing-focus-icon"><Activity size={18} /></div>
              <div>
                <span>{text.focusLabel}</span>
                <p>{text.focus}</p>
              </div>
            </div>
          </div>

          <div className="landing-section-copy landing-feedback-copy">
            <h2 id="feedback-title">{text.feedbackTitle}</h2>
            <p>{text.feedbackBody}</p>
            <button type="button" className="landing-primary-cta" onClick={onOpenApp}>
              {text.openApp} <ArrowRight size={18} />
            </button>
          </div>
        </section>

        <section className="landing-final-section" aria-labelledby="final-title">
          <h2 id="final-title">{text.finalTitle}</h2>
          <p>{text.finalBody}</p>
          <button type="button" className="landing-primary-cta" onClick={onOpenApp}>
            {text.startRehearsal} <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-footer-brand" href="#/">
          <img src="./rhythmcoach.svg" alt="" width="30" height="30" />
          <strong>RhythmCoach</strong>
        </a>
        <div>
          <a href="https://github.com/liuh886/RhythmCoach" target="_blank" rel="noopener noreferrer">GitHub</a>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{text.backToTop}</button>
        </div>
      </footer>
    </div>
  );
}
