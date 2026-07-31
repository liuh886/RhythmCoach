import { useState } from 'react';
import { ScriptEditor } from './components/ScriptEditor';
import { Teleprompter } from './components/Teleprompter';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [mode, setMode] = useState<'editor' | 'teleprompter'>('editor');
  const [activeScript, setActiveScript] = useState('');
  const [targetCpm, setTargetCpm] = useState(220);
  const [lang, setLang] = useState<'zh'|'en'>('zh');
  const [prompterMode, setPrompterMode] = useState<'target'|'free'>('target');

  const handleStart = (script: string, cpm: number, lang: 'zh' | 'en', pMode: 'target' | 'free') => {
    setActiveScript(script);
    setTargetCpm(cpm);
    setLang(lang);
    setPrompterMode(pMode);
    setMode('teleprompter');
  };

  return (
    <>
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
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
