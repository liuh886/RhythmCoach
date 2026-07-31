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
      {/* Global Utilities */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 200, display: 'flex', gap: '12px', alignItems: 'center' }}>
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
        <a 
          href="https://ko-fi.com/zhihao" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ef4444', textDecoration: 'none', fontSize: '1.2rem',
            background: 'rgba(255,255,255,0.05)', width: '40px', height: '40px', borderRadius: '50%',
            border: '1px solid var(--glass-border)', transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
          title="Buy me a coffee"
        >
          ❤
        </a>
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
