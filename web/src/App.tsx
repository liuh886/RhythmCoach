import { useState } from 'react';
import { ScriptEditor } from './components/ScriptEditor';
import { Teleprompter } from './components/Teleprompter';

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
      {mode === 'editor' && (
        <ScriptEditor onStart={handleStart} />
      )}
      
      {mode === 'teleprompter' && (
        <Teleprompter 
          script={activeScript} 
          targetCpm={targetCpm} 
          onClose={() => setMode('editor')} 
        />
      )}
    </>
  );
}

export default App;
