import { useEffect, useState } from 'react';
import { Heart, Languages, Maximize2, Minimize2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { RecordingsWidget } from './components/RecordingsWidget';
import { ScriptEditor } from './components/ScriptEditor';
import { Teleprompter } from './components/Teleprompter';
import { useAppStore } from './store';
import type { Language, PrompterMode } from './types';

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
    loadPersistedData
  } = useAppStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    void loadPersistedData();
  }, [loadPersistedData]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

  return (
    <>
      {mode === 'editor' && (
        <nav className="global-utility-dock" aria-label={globalLang === 'zh' ? '全局工具' : 'Global tools'}>
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
    </>
  );
}
