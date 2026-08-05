import { useEffect, useState } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import packageJson from '../package.json';
import { AppHeader } from './components/AppHeader';
import './components/CommercialTheme.css';
import { ProductGuide } from './components/ProductGuide';
import './components/ProductExperience.css';
import { RecordingsWidget } from './components/RecordingsWidget';
import { ScriptEditor } from './components/ScriptEditor';
import { Teleprompter } from './components/Teleprompter';
import { TrainingFocus } from './components/TrainingFocus';
import { toHtmlLanguage } from './domain/language';
import { getThemeColor, resolveTheme, THEME_STORAGE_KEY, toggleTheme, type AppTheme } from './domain/theme';
import { MembershipDialog } from './membership/MembershipDialog';
import { useAppStore } from './store';
import type { Language, PrompterMode } from './types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const GUIDE_KEY = 'rhythmcoach_product_guide_v1';

function getInitialTheme(): AppTheme {
  try {
    return resolveTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'dark';
  }
}

export default function App() {
  const {
    mode,
    setMode,
    activeTitle,
    setActiveTitle,
    activeScript,
    setActiveScript,
    activeDeliveryMarkup,
    setActiveDeliveryMarkup,
    targetPace,
    setTargetPace,
    globalLang,
    setGlobalLang,
    prompterMode,
    setPrompterMode,
    sessions,
    loadPersistedData
  } = useAppStore();
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(() => localStorage.getItem(GUIDE_KEY) !== 'complete');
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    void loadPersistedData();
  }, [loadPersistedData]);

  useEffect(() => {
    document.documentElement.lang = toHtmlLanguage(globalLang);
  }, [globalLang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', getThemeColor(theme));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The selected theme still applies for this session when storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const startSession = (
    title: string,
    script: string,
    pace: number,
    lang: Language,
    sessionMode: PrompterMode,
    deliveryMarkup: string
  ) => {
    setActiveTitle(title);
    setActiveScript(script);
    setActiveDeliveryMarkup(deliveryMarkup);
    setTargetPace(pace);
    setGlobalLang(lang);
    setPrompterMode(sessionMode);
    setMode('teleprompter');
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error('Fullscreen request failed:', error);
    }
  };

  const closeGuide = () => {
    localStorage.setItem(GUIDE_KEY, 'complete');
    setIsGuideOpen(false);
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallPrompt(null);
  };

  const openLibrary = () => {
    document.querySelector<HTMLButtonElement>('.library-launcher')?.click();
  };

  return (
    <div className={mode === 'editor' ? 'app-shell' : undefined}>
      {mode === 'editor' && (
        <AppHeader
          lang={globalLang}
          theme={theme}
          canInstall={Boolean(installPrompt)}
          isFullscreen={isFullscreen}
          onOpenLibrary={openLibrary}
          onOpenGuide={() => setIsGuideOpen(true)}
          onOpenFocus={() => setIsFocusOpen(true)}
          onInstall={() => void installApp()}
          onToggleTheme={() => setTheme((current) => toggleTheme(current))}
          onToggleLanguage={() => setGlobalLang(globalLang === 'zh' ? 'en' : 'zh')}
          onToggleFullscreen={() => void toggleFullscreen()}
        />
      )}

      {mode === 'editor' && <RecordingsWidget />}
      <AnimatePresence mode="wait">
        {mode === 'editor' ? (
          <ScriptEditor key="editor" onStart={startSession} />
        ) : (
          <Teleprompter
            key="teleprompter"
            title={activeTitle}
            script={activeScript}
            deliveryMarkup={activeDeliveryMarkup}
            targetPace={targetPace}
            lang={globalLang}
            prompterMode={prompterMode}
            onClose={() => setMode('editor')}
          />
        )}
      </AnimatePresence>

      {mode === 'editor' && (
        <footer className="app-footer">
          <div className="app-footer-trust">
            <strong><ShieldCheck size={15} /> {globalLang === 'zh' ? '本地优先' : 'Local-first'}</strong>
            <span>{globalLang === 'zh' ? '无需账户' : 'No account required'}</span>
            <span>{globalLang === 'zh' ? '音频不自动上传' : 'No automatic audio upload'}</span>
          </div>
          <div className="app-footer-meta">
            <a href="https://github.com/liuh886/RhythmCoach" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> RhythmCoach
            </a>
            <span>v{packageJson.version}</span>
          </div>
        </footer>
      )}

      <ProductGuide
        open={mode === 'editor' && isGuideOpen}
        lang={globalLang}
        canInstall={Boolean(installPrompt)}
        onInstall={() => void installApp()}
        onClose={closeGuide}
      />
      <TrainingFocus
        open={mode === 'editor' && isFocusOpen}
        lang={globalLang}
        sessions={sessions}
        onClose={() => setIsFocusOpen(false)}
      />
      <MembershipDialog lang={globalLang} />
    </div>
  );
}
