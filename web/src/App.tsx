import { useEffect, useState } from 'react';
import { Download, Heart, HelpCircle, Languages, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { ProductGuide } from './components/ProductGuide';
import './components/ProductExperience.css';
import { RecordingsWidget } from './components/RecordingsWidget';
import { ScriptEditor } from './components/ScriptEditor';
import { Teleprompter } from './components/Teleprompter';
import { TrainingFocus } from './components/TrainingFocus';
import { useAppStore } from './store';
import type { Language, PrompterMode } from './types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const GUIDE_KEY = 'rhythmcoach_product_guide_v1';

export default function App() {
  const {
    mode,
    setMode,
    activeTitle,
    setActiveTitle,
    activeScript,
    setActiveScript,
    targetPace,
    setTargetPace,
    globalLang,
    setGlobalLang,
    prompterMode,
    setPrompterMode,
    sessions,
    loadPersistedData
  } = useAppStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(() => localStorage.getItem(GUIDE_KEY) !== 'complete');
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    void loadPersistedData();
  }, [loadPersistedData]);

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

  const startSession = (title: string, script: string, pace: number, lang: Language, sessionMode: PrompterMode) => {
    setActiveTitle(title);
    setActiveScript(script);
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

  return (
    <>
      {mode === 'editor' && (
        <nav className="global-utility-dock" aria-label={globalLang === 'zh' ? '全局工具' : 'Global tools'}>
          <button
            className="btn-icon utility-button"
            onClick={() => setIsGuideOpen(true)}
            title={globalLang === 'zh' ? '打开使用引导' : 'Open quick guide'}
            aria-label={globalLang === 'zh' ? '打开使用引导' : 'Open quick guide'}
          >
            <HelpCircle size={18} />
          </button>
          <button
            className="btn-icon utility-button"
            onClick={() => setIsFocusOpen(true)}
            title={globalLang === 'zh' ? '查看下一次训练建议' : 'View next training focus'}
            aria-label={globalLang === 'zh' ? '查看下一次训练建议' : 'View next training focus'}
          >
            <Sparkles size={18} />
          </button>
          {installPrompt && (
            <button
              className="btn-icon utility-button"
              onClick={() => void installApp()}
              title={globalLang === 'zh' ? '安装 RhythmCoach' : 'Install RhythmCoach'}
              aria-label={globalLang === 'zh' ? '安装 RhythmCoach' : 'Install RhythmCoach'}
            >
              <Download size={18} />
            </button>
          )}
          <button
            className="btn-icon utility-button"
            onClick={() => setGlobalLang(globalLang === 'zh' ? 'en' : 'zh')}
            title={globalLang === 'zh' ? 'Switch to English' : '切换到中文'}
            aria-label={globalLang === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            <Languages size={18} />
          </button>
          <button
            className="btn-icon utility-button"
            onClick={() => void toggleFullscreen()}
            title={isFullscreen ? (globalLang === 'zh' ? '退出全屏' : 'Exit fullscreen') : (globalLang === 'zh' ? '进入全屏' : 'Enter fullscreen')}
            aria-label={isFullscreen ? (globalLang === 'zh' ? '退出全屏' : 'Exit fullscreen') : (globalLang === 'zh' ? '进入全屏' : 'Enter fullscreen')}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <a
            className="utility-link"
            href="https://ko-fi.com/zhihao"
            target="_blank"
            rel="noopener noreferrer"
            title={globalLang === 'zh' ? '支持 RhythmCoach' : 'Support RhythmCoach'}
            aria-label={globalLang === 'zh' ? '支持 RhythmCoach' : 'Support RhythmCoach'}
          >
            <Heart size={17} />
          </a>
        </nav>
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
            targetPace={targetPace}
            lang={globalLang}
            prompterMode={prompterMode}
            onClose={() => setMode('editor')}
          />
        )}
      </AnimatePresence>

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
    </>
  );
}
