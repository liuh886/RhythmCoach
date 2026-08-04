import { BarChart3, Download, FileText, Mic2, ShieldCheck, X } from 'lucide-react';
import packageJson from '../../package.json';
import type { Language } from '../types';

interface ProductGuideProps {
  open: boolean;
  lang: Language;
  canInstall: boolean;
  onInstall: () => void;
  onClose: () => void;
}

const copy = {
  zh: {
    eyebrow: '快速开始',
    title: '演讲和播客，录制前先练稳',
    subtitle: 'RhythmCoach 用提纲、提词、录音和可解释的节奏反馈，帮助演讲者和播客创作者减少无效停顿与重复，让逐字稿听起来更像自然表达。',
    steps: [
      { title: '准备内容', body: '粘贴演讲稿，或用“开场—大纲—结尾”组织播客脚本。', icon: FileText },
      { title: '开始训练', body: '选择自动提词或手动推进，完成一次录制前排练。', icon: Mic2 },
      { title: '查看进步', body: '回听录音，查看完成度、停顿和同稿对比。', icon: BarChart3 }
    ],
    privacy: '本地优先：无需账户，不主动上传麦克风音频。',
    version: '当前版本',
    install: '安装应用',
    start: '开始使用'
  },
  en: {
    eyebrow: 'Quick start',
    title: 'Rehearse before you record',
    subtitle: 'RhythmCoach helps speakers and podcasters use outlines, prompting, recording, and explainable pacing feedback to reduce unhelpful pauses and repetition and make scripted delivery sound more natural.',
    steps: [
      { title: 'Prepare', body: 'Paste a speech, or structure a podcast as opening, outline, and closing.', icon: FileText },
      { title: 'Rehearse', body: 'Choose automatic prompting or manual progress for a pre-recording run-through.', icon: Mic2 },
      { title: 'Review', body: 'Replay the recording and compare completion, pauses, and repeat attempts.', icon: BarChart3 }
    ],
    privacy: 'Local-first: no account and no automatic microphone upload.',
    version: 'Current version',
    install: 'Install app',
    start: 'Start using'
  }
} as const;

export function ProductGuide({ open, lang, canInstall, onInstall, onClose }: ProductGuideProps) {
  if (!open) return null;
  const text = copy[lang];

  return (
    <div className="product-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="product-dialog guide-dialog" role="dialog" aria-modal="true" aria-labelledby="product-guide-title">
        <button className="btn-icon product-dialog-close" onClick={onClose} aria-label={lang === 'zh' ? '关闭引导' : 'Close guide'}>
          <X size={17} />
        </button>

        <div className="guide-heading">
          <span>{text.eyebrow}</span>
          <h2 id="product-guide-title">{text.title}</h2>
          <p>{text.subtitle}</p>
        </div>

        <div className="guide-steps">
          {text.steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="guide-step">
                <div className="guide-step-icon"><Icon size={20} /></div>
                <div>
                  <small>0{index + 1}</small>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="guide-privacy"><ShieldCheck size={17} /> {text.privacy}</div>

        <div className="guide-version" aria-label={`${text.version} v${packageJson.version}`}>
          <span>{text.version}</span>
          <strong>v{packageJson.version}</strong>
        </div>

        <div className="product-dialog-actions">
          {canInstall && (
            <button className="btn btn-secondary" onClick={onInstall}>
              <Download size={17} /> {text.install}
            </button>
          )}
          <button className="btn" onClick={onClose}>{text.start}</button>
        </div>
      </section>
    </div>
  );
}
