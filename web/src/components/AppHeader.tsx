import './AppHeader.css';
import {
  Download,
  Heart,
  HelpCircle,
  Languages,
  Library,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import packageJson from '../../package.json';
import type { Language } from '../types';

interface AppHeaderProps {
  lang: Language;
  canInstall: boolean;
  isFullscreen: boolean;
  isLibraryOpen: boolean;
  onOpenLibrary: () => void;
  onOpenGuide: () => void;
  onOpenFocus: () => void;
  onInstall: () => void;
  onToggleLanguage: () => void;
  onToggleFullscreen: () => void;
}

const copy = {
  zh: {
    product: '口播训练工作台',
    stable: '稳定版',
    local: '本地优先',
    library: '素材库',
    focus: '训练建议',
    install: '安装',
    guide: '使用帮助',
    language: 'Switch to English',
    fullscreen: '进入全屏',
    exitFullscreen: '退出全屏',
    support: '支持 RhythmCoach'
  },
  en: {
    product: 'Voice rehearsal workspace',
    stable: 'Stable',
    local: 'Local-first',
    library: 'Library',
    focus: 'Coaching',
    install: 'Install',
    guide: 'Help',
    language: '切换到中文',
    fullscreen: 'Enter fullscreen',
    exitFullscreen: 'Exit fullscreen',
    support: 'Support RhythmCoach'
  }
} as const;

export function AppHeader({
  lang,
  canInstall,
  isFullscreen,
  isLibraryOpen,
  onOpenLibrary,
  onOpenGuide,
  onOpenFocus,
  onInstall,
  onToggleLanguage,
  onToggleFullscreen
}: AppHeaderProps) {
  const text = copy[lang];

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="brand-lockup" aria-label={`RhythmCoach v${packageJson.version}`}>
          <img src="./rhythmcoach.svg" alt="" width="40" height="40" />
          <div className="brand-copy">
            <div className="brand-name-row">
              <strong>RhythmCoach</strong>
              <span className="release-chip">v{packageJson.version}</span>
            </div>
            <span>{text.product}</span>
          </div>
        </div>

        <div className="app-header-trust" title={lang === 'zh' ? '核心稿件、训练记录与录音保存在当前浏览器' : 'Core scripts, sessions, and recordings stay in this browser'}>
          <ShieldCheck size={15} />
          <span>{text.local}</span>
          <i>{text.stable}</i>
        </div>

        <nav className="app-header-actions" aria-label={lang === 'zh' ? '应用导航' : 'Application navigation'}>
          <button
            type="button"
            className="header-action header-action-primary"
            onClick={onOpenLibrary}
            aria-expanded={isLibraryOpen}
            title={text.library}
          >
            <Library size={17} />
            <span>{text.library}</span>
          </button>
          <button type="button" className="header-action header-action-primary" onClick={onOpenFocus} title={text.focus}>
            <Sparkles size={17} />
            <span>{text.focus}</span>
          </button>
          {canInstall && (
            <button type="button" className="header-action install-action" onClick={onInstall} title={text.install}>
              <Download size={17} />
              <span>{text.install}</span>
            </button>
          )}

          <span className="header-divider" aria-hidden="true" />

          <button type="button" className="header-icon-action" onClick={onOpenGuide} title={text.guide} aria-label={text.guide}>
            <HelpCircle size={18} />
          </button>
          <button type="button" className="header-icon-action language-action" onClick={onToggleLanguage} title={text.language} aria-label={text.language}>
            <Languages size={18} />
            <span>{lang === 'zh' ? 'EN' : '中'}</span>
          </button>
          <button
            type="button"
            className="header-icon-action header-optional"
            onClick={onToggleFullscreen}
            title={isFullscreen ? text.exitFullscreen : text.fullscreen}
            aria-label={isFullscreen ? text.exitFullscreen : text.fullscreen}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <a
            className="header-icon-action header-optional support-action"
            href="https://ko-fi.com/zhihao"
            target="_blank"
            rel="noopener noreferrer"
            title={text.support}
            aria-label={text.support}
          >
            <Heart size={17} />
          </a>
        </nav>
      </div>
    </header>
  );
}
