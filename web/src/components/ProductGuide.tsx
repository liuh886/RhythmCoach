import { BarChart3, Download, FileText, Mic2, ShieldCheck, X } from 'lucide-react';
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
    title: '把口播练稳，而不只是读完',
    subtitle: '三步完成一次可复盘的练习。稿件、训练记录和录音默认只保存在当前浏览器。',
    steps: [
      { title: '准备稿件', body: '粘贴或选择稿件，设定训练模式与目标语速。', icon: FileText },
      { title: '开始训练', body: '跟随提词完成口播，必要时暂停、调整或重新开始。', icon: Mic2 },
      { title: '查看进步', body: '回听录音，查看完成度、停顿和同稿对比。', icon: BarChart3 }
    ],
    privacy: '本地优先：无需账户，不主动上传麦克风音频。',
    install: '安装应用',
    start: '开始使用'
  },
  en: {
    eyebrow: 'Quick start',
    title: 'Practice the delivery, not just the script',
    subtitle: 'Complete a measurable rehearsal in three steps. Scripts, sessions, and recordings stay in this browser by default.',
    steps: [
      { title: 'Prepare', body: 'Paste or choose a script, then set a mode and target pace.', icon: FileText },
      { title: 'Rehearse', body: 'Use the teleprompter, pause when needed, and keep the delivery focused.', icon: Mic2 },
      { title: 'Review', body: 'Replay the recording and compare completion, pauses, and repeat attempts.', icon: BarChart3 }
    ],
    privacy: 'Local-first: no account and no automatic microphone upload.',
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
