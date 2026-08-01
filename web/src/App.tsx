import { useEffect, useState } from 'react';
import { Languages, Maximize2, Minimize2 } from 'lucide-react';
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
      <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 180, display: 'flex', gap: 10 }}>
        {mode === 'editor' && (
          <button
            className="btn-icon"
            onClick={() => setGlobalLang(globalLang === 'zh' ? 'en' : 'zh')}
            title={globalLang === 'zh' ? 'Switch to English' : '切换到中文'}
            style={{ width: 40, height: 40, backdropFilter: 'blur(12px)' }}
          >
            <Languages size={19} />
          </button>
        )}
        <button className="btn-icon" onClick={() => void toggleFullscreen()} style={{ width: 40, height: 40, backdropFilter: 'blur(12px)' }}>
          {isFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
        </button>
        <a
          href="https://ko-fi.com/zhihao"
          target="_blank"
          rel="noopener noreferrer"
          title="Buy me a coffee"
          style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#ef4444', textDecoration: 'none', background: 'rgba(255,255,255,.05)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }}
        >
          ♥
        </a>
      </div>

      <RecordingsWidget />
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
