import { useState } from 'react';
import { ScriptEditor } from './components/ScriptEditor';
import { Teleprompter } from './components/Teleprompter';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [mode, setMode] = useState<'editor' | 'teleprompter'>('editor');
  const [activeScript, setActiveScript] = useState('');
  const [targetCpm, setTargetCpm] = useState(220);

  const handleStart = (script: string, cpm: number) => {
    setActiveScript(script);
    setTargetCpm(cpm);
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
            onClose={() => setMode('editor')} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
