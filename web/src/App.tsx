import { useEffect } from 'react';
import { ScriptEditor } from './components/ScriptEditor';
import { Teleprompter } from './components/Teleprompter';
import { RecordingsWidget } from './components/RecordingsWidget';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Minimize2, Languages, Mic, Check } from 'lucide-react';
import { useAppStore } from './store';

function App() {
  return (
    <AppInner />
  );
}

// Inner component so we can use local state cleanly without messing with the replaced file bounds
import { useState } from 'react';
function AppInner() {
  const {
    mode, setMode,
    activeScript, setActiveScript,
    targetCpm, setTargetCpm,
    globalLang, setGlobalLang,
    prompterMode, setPrompterMode,
    audioProfile, setAudioProfile,
    loadRecordings
  } = useAppStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

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
    setGlobalLang(lang);
    setPrompterMode(pMode);
    setMode('teleprompter');
  };

  return (
    <>
      {/* Global Utilities */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 200, display: 'flex', gap: '12px', alignItems: 'center' }}>
        {mode === 'teleprompter' && (
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowAudioMenu(!showAudioMenu)}
              className="btn-icon" 
              style={{ 
                background: showAudioMenu ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255,255,255,0.05)', 
                borderColor: showAudioMenu ? 'var(--accent-primary)' : 'var(--glass-border)', 
                color: showAudioMenu ? 'var(--accent-primary)' : 'var(--text-secondary)',
                backdropFilter: 'blur(10px)',
                width: '40px', height: '40px'
              }}
              title={globalLang === 'zh' ? "录音增强设置" : "Audio DSP Settings"}
            >
              <Mic size={20} />
            </button>

            <AnimatePresence>
              {showAudioMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  style={{
                    position: 'absolute', bottom: '50px', right: '0',
                    background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                    borderRadius: '12px', padding: '12px', width: '220px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 300,
                    backdropFilter: 'blur(20px)'
                  }}
                >
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {globalLang === 'zh' ? '人声增强 (DSP)' : 'Voice Enhancement'}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { id: 'raw', labelZh: '原声 (无处理)', labelEn: 'Raw (None)' },
                      { id: 'podcast', labelZh: '播客 (温暖自然)', labelEn: 'Podcast (Warm)' },
                      { id: 'broadcast', labelZh: '广播 (清晰透亮)', labelEn: 'Broadcast (Crisp)' }
                    ].map(prof => (
                      <button
                        key={prof.id}
                        onClick={() => {
                          setAudioProfile(prof.id as any);
                          setTimeout(() => setShowAudioMenu(false), 200);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: audioProfile === prof.id ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                          color: audioProfile === prof.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                          border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                          fontSize: '0.85rem', textAlign: 'left', transition: 'all 0.2s'
                        }}
                      >
                        {globalLang === 'zh' ? prof.labelZh : prof.labelEn}
                        {audioProfile === prof.id && <Check size={14} color="var(--accent-primary)" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        {mode === 'editor' && (
          <button 
            onClick={() => setGlobalLang(globalLang === 'zh' ? 'en' : 'zh')}
            className="btn-icon" 
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              borderColor: 'var(--glass-border)', 
              color: 'var(--text-secondary)',
              backdropFilter: 'blur(10px)',
              width: '40px', height: '40px'
            }}
            title={globalLang === 'zh' ? "Switch to English" : "切换到中文"}
          >
            <Languages size={20} />
          </button>
        )}
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

      <RecordingsWidget />
      <AnimatePresence mode="wait">
        {mode === 'editor' && (
          <ScriptEditor key="editor" onStart={handleStart} globalLang={globalLang} setGlobalLang={setGlobalLang} />
        )}
        
        {mode === 'teleprompter' && (
          <Teleprompter 
            key="teleprompter"
            script={activeScript} 
            targetCpm={targetCpm} 
            lang={globalLang}
            prompterMode={prompterMode}
            onClose={() => setMode('editor')} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
