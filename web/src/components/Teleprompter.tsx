import { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Activity } from 'lucide-react';

interface TeleprompterProps {
  script: string;
  targetCpm: number;
  onClose: () => void;
}

type VoiceState = 'SPEAKING' | 'SILENCE';

export function Teleprompter({ script, targetCpm, onClose }: TeleprompterProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('SILENCE');
  const [currentCpm, setCurrentCpm] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);
  
  // Audio Analysis Setup
  useEffect(() => {
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let silenceStart = 0;
    
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const checkAudio = () => {
          analyser.getByteTimeDomainData(dataArray as any);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const amplitude = (dataArray[i] - 128) / 128.0;
            sum += amplitude * amplitude;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          
          if (rms > 0.02) { // Speaking threshold
            setVoiceState('SPEAKING');
            silenceStart = 0;
            // Fake CPM calculation for MVP
            setCurrentCpm(prev => prev === 0 ? targetCpm : prev + (Math.random() > 0.5 ? 1 : -1));
          } else {
            if (silenceStart === 0) silenceStart = performance.now();
            if (performance.now() - silenceStart > 1200) { // 1.2s silence
              setVoiceState('SILENCE');
              setCurrentCpm(0);
            }
          }
          
          if (isPlaying) {
            requestRef.current = requestAnimationFrame(checkAudio);
          }
        };
        
        if (isPlaying) {
          checkAudio();
        }
      } catch (err) {
        console.error("Microphone access denied or error:", err);
      }
    };
    
    if (isPlaying && !audioContextRef.current) {
      initAudio();
    } else if (!isPlaying && audioContextRef.current) {
      // pause logic handled in checkAudio stopping requestAnimationFrame
    }
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, targetCpm]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      audioContextRef.current?.close();
    };
  }, []);

  // Scrolling logic
  useEffect(() => {
    let scrollRequest: number;
    let lastTime = performance.now();
    
    const scroll = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      
      if (isPlaying && voiceState === 'SPEAKING' && scrollRef.current) {
        // CPM to pixels per second roughly
        // If 220 chars/min, approx 3.6 chars/sec. Assume 1 char = 30px height, so ~110px/sec
        const pixelsPerSecond = (targetCpm / 60) * 30; 
        const scrollAmount = (pixelsPerSecond * delta) / 1000;
        scrollRef.current.scrollTop += scrollAmount;
      }
      
      scrollRequest = requestAnimationFrame(scroll);
    };
    
    scrollRequest = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(scrollRequest);
  }, [isPlaying, voiceState, targetCpm]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-dark)' }}>
      {/* Floating Widget overlay (simulated) */}
      <div 
        className="glass-panel" 
        style={{ 
          position: 'absolute', top: '20px', right: '20px', zIndex: 100, 
          width: '250px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' 
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ 
            color: voiceState === 'SPEAKING' ? 'var(--status-stable)' : 'var(--status-pause)',
            fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <Activity size={18} className={voiceState === 'SPEAKING' ? 'pulse' : ''} />
            {voiceState === 'SPEAKING' ? '稳定' : '停顿中'}
          </span>
          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
          {currentCpm} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CPM</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', height: '30px', alignItems: 'flex-end', opacity: voiceState === 'SPEAKING' ? 1 : 0.3 }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{ 
              width: '10px', 
              height: `${Math.random() * 100}%`, 
              backgroundColor: 'var(--accent-primary)',
              borderRadius: '2px'
            }} />
          ))}
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <h3 style={{ margin: 0 }}>提词模式</h3>
        <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '40px 10%', 
          fontSize: '48px', 
          lineHeight: '1.8',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.9)',
          scrollBehavior: 'auto'
        }}
      >
        {/* Placeholder spacer to allow scrolling past the end */}
        <div style={{ height: '30vh' }} />
        {script.split('\n').map((line, i) => (
          <p key={i} style={{ marginBottom: '1em', opacity: 0.8 }}>{line}</p>
        ))}
        <div style={{ height: '70vh' }} />
      </div>
    </div>
  );
}
