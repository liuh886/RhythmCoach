import { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Activity, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);
  const [audioData, setAudioData] = useState<number[]>(Array(12).fill(10));
  
  // Fullscreen handling
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  // Audio Analysis Setup
  useEffect(() => {
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let silenceStart = 0;
    let lastVolumeUpdate = 0;
    
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
        
        const checkAudio = (time: number) => {
          analyser.getByteTimeDomainData(dataArray as any);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const amplitude = (dataArray[i] - 128) / 128.0;
            sum += amplitude * amplitude;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          
          if (time - lastVolumeUpdate > 50) {
            // Update visualizer data
            setAudioData(prev => {
              const newData = [...prev.slice(1)];
              newData.push(Math.max(10, rms * 800)); // scale up rms for visual
              return newData;
            });
            lastVolumeUpdate = time;
          }
          
          if (rms > 0.02) { 
            setVoiceState('SPEAKING');
            silenceStart = 0;
            // Fake CPM calculation for MVP to show activity
            setCurrentCpm(prev => {
              if (prev === 0) return targetCpm;
              const vary = Math.random() > 0.8 ? (Math.random() > 0.5 ? 2 : -2) : 0;
              return Math.max(0, prev + vary);
            });
          } else {
            if (silenceStart === 0) silenceStart = time;
            if (time - silenceStart > 1200) { 
              setVoiceState('SILENCE');
              setCurrentCpm(0);
            }
          }
          
          if (isPlaying) {
            requestRef.current = requestAnimationFrame(checkAudio);
          }
        };
        
        if (isPlaying) {
          requestRef.current = requestAnimationFrame(checkAudio);
        }
      } catch (err) {
        console.error("Microphone access denied or error:", err);
      }
    };
    
    if (isPlaying && !audioContextRef.current) {
      initAudio();
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
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(()=>{});
      }
    };
  }, []);

  // Scrolling logic
  useEffect(() => {
    let scrollRequest: number;
    let lastTime = performance.now();
    
    const scroll = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      
      // We only scroll if playing and NOT silent
      if (isPlaying && voiceState === 'SPEAKING' && scrollRef.current) {
        // Average char height in this layout is ~90px, targetCpm is per minute.
        // pixelsPerSecond = (cpm / 60) * charsPerRow
        // For a teleprompter, usually people tune speed directly. We map targetCpm to a reasonable speed.
        const pixelsPerSecond = (targetCpm / 60) * 15; // tuning factor
        const scrollAmount = (pixelsPerSecond * delta) / 1000;
        scrollRef.current.scrollTop += scrollAmount;
      }
      
      scrollRequest = requestAnimationFrame(scroll);
    };
    
    scrollRequest = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(scrollRequest);
  }, [isPlaying, voiceState, targetCpm]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: 'var(--bg-base)',
        zIndex: 50,
        overflow: 'hidden'
      }}
    >
      {/* Draggable Rhythm Widget */}
      <motion.div 
        drag
        dragMomentum={false}
        className="glass-panel" 
        style={{ 
          position: 'absolute', top: '80px', right: '40px', zIndex: 100, 
          width: '280px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
          cursor: 'grab', border: '1px solid var(--glass-highlight)',
          backgroundColor: 'rgba(24, 24, 27, 0.85)'
        }}
        whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ 
            color: voiceState === 'SPEAKING' ? 'var(--status-stable)' : 'var(--status-pause)',
            fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '0.95rem'
          }}>
            <Activity size={18} className={voiceState === 'SPEAKING' ? 'pulse' : ''} />
            {voiceState === 'SPEAKING' ? '状态稳定' : '检测停顿中'}
          </span>
          <button 
            className="btn-icon" 
            style={{ 
              background: isPlaying ? 'var(--accent-glow)' : 'rgba(255,255,255,0.05)',
              borderColor: isPlaying ? 'var(--accent-primary)' : 'var(--glass-border)',
              color: isPlaying ? 'white' : 'var(--text-primary)'
            }} 
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-2px' }}>
            {currentCpm}
          </span>
          <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CPM</span>
        </div>

        {/* Audio Visualizer */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', height: '40px', 
          alignItems: 'flex-end', opacity: voiceState === 'SPEAKING' ? 1 : 0.2,
          transition: 'opacity 0.3s ease',
          gap: '4px'
        }}>
          {audioData.map((val, i) => (
            <motion.div key={i} 
              animate={{ height: `${Math.min(100, Math.max(10, val))}%` }}
              transition={{ type: "spring", bounce: 0, duration: 0.1 }}
              style={{ 
                flex: 1, 
                backgroundColor: 'var(--accent-primary)',
                borderRadius: '4px',
                backgroundImage: 'linear-gradient(to top, var(--accent-secondary), var(--accent-primary))'
              }} 
            />
          ))}
        </div>
      </motion.div>

      {/* Top Bar */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60,
        padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isPlaying ? 'var(--status-stable)' : 'var(--status-pause)', boxShadow: isPlaying ? '0 0 10px var(--status-stable)' : 'none' }} />
          <h3 style={{ margin: 0, fontWeight: 600, letterSpacing: '2px', color: 'rgba(255,255,255,0.6)' }}>LIVE PROMPTER</h3>
        </div>
        <div style={{ display: 'flex', gap: '12px', pointerEvents: 'auto' }}>
          <button className="btn-icon" onClick={toggleFullscreen} title="Toggle Fullscreen">
            {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
          </button>
          <button className="btn-icon" onClick={onClose} style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Teleprompter Text Area */}
      <div 
        className="fade-mask"
        style={{ height: '100vh', width: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <div 
          ref={scrollRef}
          style={{ 
            width: '100%', maxWidth: '1000px',
            overflowY: 'auto', 
            padding: '50vh 40px', 
            fontSize: 'min(5.5vw, 72px)', 
            lineHeight: '1.6',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.95)',
            scrollBehavior: 'auto'
          }}
        >
          {script.split('\n').map((line, i) => (
            <p key={i} style={{ 
              marginBottom: '1.2em', 
              textShadow: '0 4px 24px rgba(0,0,0,0.5)',
              letterSpacing: '1px',
              wordBreak: 'keep-all'
            }}>
              {line || ' '}
            </p>
          ))}
          <div style={{ height: '50vh' }} />
        </div>
      </div>
      
      {/* Focus Line overlay */}
      <div style={{
        position: 'absolute', top: '50%', left: '0', right: '0', height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.5) 50%, transparent 100%)',
        zIndex: 40, pointerEvents: 'none',
        transform: 'translateY(-50%)',
        boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
      }} />
    </motion.div>
  );
}
