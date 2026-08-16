import { lazy, Suspense, useEffect, useState } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import packageJson from '../package.json';
import './components/CommercialTheme.css';
import { LandingPage } from './components/LandingPage';
import { PodcastSyncRoom, type PodcastSyncContent } from './components/PodcastSyncRoom';
import './components/ProductExperience.css';
import { toHtmlLanguage } from './domain/language';
import {
  hashForProductSurface,
  resolveProductSurface,
  type ProductSurface
} from './domain/productSurface';
import { getThemeColor, resolveTheme, THEME_STORAGE_KEY, toggleTheme, type AppTheme } from './domain/theme';
import { useAppStore } from './store';
import type { Language, PrompterMode } from './types';

const AppHeader = lazy(() =>
  import('./components/AppHeader').then((module) => ({ default: module.AppHeader }))
);
const ProductGuide = lazy(() =>
  import('./components/ProductGuide').then((module) => ({ default: module.ProductGuide }))
);
const PrompterDisplayControls = lazy(() =>
  import('./components/PrompterDisplayControls').then((module) => ({ default: module.PrompterDisplayControls }))
);
const RecordingsWidget = lazy(() =>
  import('./components/RecordingsWidget').then((module) => ({ default: module.RecordingsWidget }))
);
const ScriptEditor = lazy(() =>
  import('./components/ScriptEditor').then((module) => ({ default: module.ScriptEditor }))
);
const Teleprompter = lazy(() =>
  import('./components/Teleprompter').then((module) => ({ default: module.Teleprompter }))
);
const TrainingFocus = lazy(() =>
  import('./components/TrainingFocus').then((module) => ({ default: module.TrainingFocus }))
);
const MembershipDialog = lazy(() =>
  import('./membership/MembershipDialog').then((module) => ({ default: module.MembershipDialog }))
);

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
  const [surface, setSurface] = useState<ProductSurface>(() => resolveProductSurface(window.location.hash));
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(() => localStorage.getItem(GUIDE_KEY) !== 'complete');
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [podcastSyncContent, setPodcastSyncContent] = useState<PodcastSyncContent | null>(null);

  useEffect(() => {
    void loadPersistedData();
  }, [loadPersistedData]);

  useEffect(() => {
    const syncSurface = () => setSurface(resolveProductSurface(window.location.hash));
    syncSurface();
    window.addEventListener('hashchange', syncSurface);
    return () => window.removeEventListener('hashchange', syncSurface);
  }, []);

  useEffect(() => {
    document.body.dataset.surface = surface;
    return () => {
      delete document.body.dataset.surface;
    };
  }, [surface]);

  useEffect(() => {
    const isChinese = globalLang === 'zh';
    document.documentElement.lang = toHtmlLanguage(globalLang);

    if (surface === 'landing') {
      document.title = isChinese
        ? 'RhythmCoach · 把表达练稳，再开始录制'
        : 'RhythmCoach · Rehearse before you record';
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute(
        'content',
        isChinese
          ? 'RhythmCoach 为演讲者和播客创作者提供提纲、提词、录音与可解释的节奏反馈，让你在正式录制前完整排练。'
          : 'RhythmCoach helps speakers and podcasters rehearse with outlines, prompting, recording, and explainable pacing feedback before the real take.'
      );
      return;
    }

    document.title = isChinese
      ? 'RhythmCoach · 录制前排练'
      : 'RhythmCoach · Pre-recording rehearsal';
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute(
      'content',
      isChinese
        ? 'RhythmCoach 是演讲者、播客创作者的录制前排练工具，支持提纲、提词、录音和可解释的节奏反馈。'
        : 'RhythmCoach is a pre-recording rehearsal tool for speakers and podcasters, with outlines, prompting, recording, and explainable pacing feedback.'
    );
  }, [globalLang, surface]);

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

  const navigateToSurface = (nextSurface: ProductSurface) => {
    const nextHash = hashForProductSurface(nextSurface);
    if (window.location.hash === nextHash) {
      setSurface(nextSurface);
      return;
    }
    window.location.hash = nextHash;
  };

  const startSession = (
    title: string,
    script: string,
    pace: number,
    lang: Language,
    sessionMode: PrompterMode,
    deliveryMarkup: string
  ) => {
    if (!document.fullscreenElement && document.fullscreenEnabled) {
      void document.documentElement.requestFullscreen().catch(() => {
        // Installed PWAs remain immersive even when the browser Fullscreen API is unavailable.
      });
    }
    setPodcastSyncContent(null);
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

  const closeTeleprompter = () => {
    setPodcastSyncContent(null);
    setMode('editor');
  };

  const teleprompterTitle = podcastSyncContent?.title ?? activeTitle;
  const teleprompterScript = podcastSyncContent?.script ?? activeScript;
  const teleprompterDeliveryMarkup = podcastSyncContent?.deliveryMarkup ?? activeDeliveryMarkup;

  if (surface === 'landing') {
    return (
      <LandingPage
        lang={globalLang}
        theme={theme}
        onOpenApp={() => navigateToSurface('app')}
        onToggleLanguage={() => setGlobalLang(globalLang === 'zh' ? 'en' : 'zh')}
        onToggleTheme={() => setTheme((current) => toggleTheme(current))}
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <div className={mode === 'editor' ? 'app-shell' : undefined}>
        {mode === 'editor' && (
          <AppHeader
            lang={globalLang}
            theme={theme}
            canInstall={Boolean(installPrompt)}
            isFullscreen={isFullscreen}
            onOpenHome={() => navigateToSurface('landing')}
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
        {mode === 'teleprompter' && <PrompterDisplayControls lang={globalLang} />}
        <AnimatePresence mode="wait">
          {mode === 'editor' ? (
            <ScriptEditor key="editor" onStart={startSession} />
          ) : (
            <Teleprompter
              key="teleprompter"
              title={teleprompterTitle}
              script={teleprompterScript}
              deliveryMarkup={teleprompterDeliveryMarkup}
              targetPace={targetPace}
              lang={globalLang}
              prompterMode={prompterMode}
              onClose={closeTeleprompter}
            />
          )}
        </AnimatePresence>

        {mode === 'teleprompter' && prompterMode === 'free' && (
          <PodcastSyncRoom
            title={activeTitle}
            script={activeScript}
            deliveryMarkup={activeDeliveryMarkup}
            lang={globalLang}
            onRoomContentChange={setPodcastSyncContent}
          />
        )}

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
    </Suspense>
  );
}
