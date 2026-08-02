import './AppHeader.css';
import {
  Download,
  Heart,
  HelpCircle,
  Languages,
  Library,
  Maximize2,
  Minimize2,
  Moon,
  Sparkles,
  Sun
} from 'lucide-react';
import packageJson from '../../package.json';
import type { AppTheme } from '../domain/theme';
import type { Language } from '../types';

interface AppHeaderProps {
  lang: Language;
  theme: AppTheme;
  canInstall: boolean;
  isFullscreen: boolean;
  onOpenLibrary: () => void;
  onOpenGuide: () => void;
  onOpenFocus: () => void;
  onInstall: () => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onToggleFullscreen: () => void;
}

const copy = {
  zh: {
    product: '口播训练工作台',
    library: '素材库',
    focus: '训练建议',
    install: '安装',
    guide: '使用帮助',
    lightTheme: '切换到白色模式',
    darkTheme: '切换到深色模式',
    language: 'Switch to English',
    fullscreen: '进入全屏',
    exitFullscreen: '退出全屏',
    support: '支持 RhythmCoach'
  },
  en: {
    product: 'Voice rehearsal workspace',
    library: 'Library',
    focus: 'Coaching',
    install: 'Install',
    guide: 'Help',
    lightTheme: 'Switch to light mode',
    darkTheme: 'Switch to dark mode',
    language: '切换到中文',
    fullscreen: 'Enter fullscreen',
    exitFullscreen: 'Exit fullscreen',
    support: 'Support RhythmCoach'
  }
} as const;

export function AppHeader({
  lang,
  theme,
  canInstall,
  isFullscreen,
  onOpenLibrary,
  onOpenGuide,
  onOpenFocus,
  onInstall,
  onToggleTheme,
  onToggleLanguage,
  onToggleFullscreen
}: AppHeaderProps) {
  const text = copy[lang];
  const themeLabel = theme === 'dark' ? text.lightTheme : text.darkTheme;

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

        <nav className="app-header-actions" aria-label={lang === 'zh' ? '应用导航' : 'Application navigation'}>
          <button type="button" className="header-action header-action-primary" onClick={onOpenLibrary} title={text.library}>
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
          <button
            type="button"
            className="header-icon-action theme-action"
            onClick={onToggleTheme}
            title={themeLabel}
            aria-label={themeLabel}
            aria-pressed={theme === 'light'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
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
