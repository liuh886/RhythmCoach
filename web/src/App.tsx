import { useState, useEffect } from 'react';
import { ScriptEditor } from './components/ScriptEditor';
import { Teleprompter } from './components/Teleprompter';
import { RecordingsWidget } from './components/RecordingsWidget';
import { AnimatePresence } from 'framer-motion';
import { Recording } from './types';
import { Maximize2, Minimize2 } from 'lucide-react';

function App() {
  const [mode, setMode] = useState<'editor' | 'teleprompter'>('editor');
  const [activeScript, setActiveScript] = useState('');
  const [targetCpm, setTargetCpm] = useState(220);
  const [lang, setLang] = useState<'zh'|'en'>('zh');
  const [prompterMode, setPrompterMode] = useState<'target'|'free'>('target');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleStart = (script: string, cpm: number, lang: 'zh' | 'en', pMode: 'target' | 'free') => {
    setActiveScript(script);
    setTargetCpm(cpm);
    setLang(lang);
    setPrompterMode(pMode);
    setMode('teleprompter');
  };

  return (
    <>
      {/* Global Fullscreen Button */}
      <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 200 }}>
        <button 
          onClick={toggleFullscreen}
          className="btn-icon" 
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            borderColor: 'var(--glass-border)', 
            color: 'var(--text-secondary)',
            backdropFilter: 'blur(10px)',
            width: '40px', height: '40px'
          }}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>

      <RecordingsWidget recordings={recordings} setRecordings={setRecordings} />
      <AnimatePresence mode="wait">
        {mode === 'editor' && (
          <ScriptEditor key="editor" onStart={handleStart} />
        )}
        
        {mode === 'teleprompter' && (
          <Teleprompter 
            key="teleprompter"
            script={activeScript} 
            targetCpm={targetCpm} 
            lang={lang}
            prompterMode={prompterMode}
            onClose={() => setMode('editor')} 
            setRecordings={setRecordings}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
