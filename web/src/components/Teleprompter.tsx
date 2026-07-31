import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, X, CheckCircle2, Settings2, Activity, FlipHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';

interface TeleprompterProps {
  script: string;
  targetCpm: number;
  lang: 'zh' | 'en';
  prompterMode: 'target' | 'free';
  onClose: () => void;
}

type VoiceState = 'SPEAKING' | 'SILENCE';

export function Teleprompter({ script, targetCpm, lang, prompterMode, onClose }: TeleprompterProps) {
  const addRecording = useAppStore(state => state.addRecording);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('SILENCE');
  const [isMirrored, setIsMirrored] = useState(false);
  
  // Local CPM allows adjusting speed during reading
  const [localTargetCpm, setLocalTargetCpm] = useState(targetCpm);
  const [currentCpm, setCurrentCpm] = useState(0);
  
  
  // Recordings
  const [isRecording, setIsRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const recDurationRef = useRef(0);
  
  const [manualScrollTimeout, setManualScrollTimeout] = useState<number | null>(null);
  
  const [showSummary, setShowSummary] = useState(false);
  const [stats, setStats] = useState({ totalTime: 0, speakingTime: 0, avgCpm: 0 });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [audioData, setAudioData] = useState<number[]>(Array(12).fill(10));
  
  const speakingTimeMsRef = useRef<number>(0);
  const totalTimeMsRef = useRef<number>(0);
  const wordCountRef = useRef<number>(0);

  useEffect(() => {
    wordCountRef.current = lang === 'zh' 
      ? (script.match(/[\u4e00-\u9fa5a-zA-Z0-9]/g) || []).length
      : (script.match(/\b\w+\b/g) || []).length;
  }, [script, lang]);
  
  const handleManualScroll = useCallback(() => {
    if (manualScrollTimeout) clearTimeout(manualScrollTimeout);
    const timeout = window.setTimeout(() => {
      setManualScrollTimeout(null);
    }, 1500);
    setManualScrollTimeout(timeout);
  }, [manualScrollTimeout]);
  
  // Audio Analysis & Recording Setup
  useEffect(() => {
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let silenceStart = 0;
    let lastVolumeUpdate = 0;
    let lastTime = performance.now();
    
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true, // Keep on to avoid static, but disable AGC
            autoGainControl: false, // Disabling this fixes the 'pumping/rigid' volume issues
            channelCount: 1
          } 
        });
        streamRef.current = stream;
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        
        const source = audioCtx.createMediaStreamSource(stream);
        
        // Natural Podcast Processing Chain
        
        // 1. High-pass filter to remove low-frequency rumble
        const highpass = audioCtx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 80;
        
        // 2. Broadcast EQ: Low Shelf (Adds natural body, not too boomy)
        const lowShelf = audioCtx.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = 150;
        lowShelf.gain.value = 1.5; 
        
        // 3. Broadcast EQ: High Shelf (Adds 'air' and openness, much less rigid than peaking)
        const presence = audioCtx.createBiquadFilter();
        presence.type = 'highshelf';
        presence.frequency.value = 4000;
        presence.gain.value = 2;
        
        // 4. Dynamics Compressor (Gentle 'glue', prevents squashed/rigid sound)
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -18; // Only compress the louder peaks
        compressor.knee.value = 15;       // Very soft knee for transparent transition
        compressor.ratio.value = 2.5;     // Gentle ratio
        compressor.attack.value = 0.005;  // 5ms attack
        compressor.release.value = 0.25;  // 250ms release (natural decay, no pumping)
        
        // 5. Hard Limiter (Safety net against clipping)
        const limiter = audioCtx.createDynamicsCompressor();
        limiter.threshold.value = -2; // Cap at -2dB
        limiter.knee.value = 0;
        limiter.ratio.value = 20; 
        limiter.attack.value = 0.001;
        limiter.release.value = 0.05;

        // Connect the chain sequentially
        source.connect(highpass);
        highpass.connect(lowShelf);
        lowShelf.connect(presence);
        presence.connect(compressor);
        compressor.connect(limiter);
        
        // Create a new stream from the processed audio
        const dest = audioCtx.createMediaStreamDestination();
        limiter.connect(dest);
        const processedStream = dest.stream;

        // Setup Analyzer for visualizer
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        compressor.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        // Setup Recording using PROCESSED stream
        const mediaRecorder = new MediaRecorder(processedStream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
          if (audioChunksRef.current.length === 0) return;
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          const duration = recDurationRef.current;
          const newRec = {
            id: Math.random().toString(36).substring(7),
            url,
            name: `Rec_${new Date().toLocaleTimeString().replace(/:/g,'-')}`,
            durationSec: duration,
            blob: audioBlob
          };
          addRecording(newRec);
        };

        if (isPlaying) {
          audioChunksRef.current = [];
          setRecDuration(0);
          recDurationRef.current = 0;
          mediaRecorder.start(1000);
          setIsRecording(true);
        }
        
        const checkAudio = (time: number) => {
          const delta = time - lastTime;
          lastTime = time;
          
          if (isPlaying) {
            totalTimeMsRef.current += delta;
          }

          analyser.getByteTimeDomainData(dataArray as any);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const amplitude = (dataArray[i] - 128) / 128.0;
            sum += amplitude * amplitude;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          
          if (time - lastVolumeUpdate > 50) {
            setAudioData(prev => {
              const newData = [...prev.slice(1)];
              newData.push(Math.max(10, rms * 800)); 
              return newData;
            });
            lastVolumeUpdate = time;
          }
          
          let isSpeakingNow = false;
          if (rms > 0.02) { 
            isSpeakingNow = true;
            setVoiceState('SPEAKING');
            silenceStart = 0;
          } else {
            if (silenceStart === 0) silenceStart = time;
            if (time - silenceStart > 1200) { 
              setVoiceState('SILENCE');
            } else {
              isSpeakingNow = true; // still count as speaking during short pauses
            }
          }
          
          if (isPlaying && isSpeakingNow) {
            speakingTimeMsRef.current += delta;
          }
          
          requestRef.current = requestAnimationFrame(checkAudio);
        };
        
        requestRef.current = requestAnimationFrame(checkAudio);
        
      } catch (err) {
        console.error("Microphone access denied or error:", err);
      }
    };
    
    if (isPlaying && !audioContextRef.current) {
      initAudio();
      lastTime = performance.now();
    } else {
      lastTime = performance.now();
    }
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  // Update currentCpm 
  useEffect(() => {
    let interval: number;
    if (prompterMode === 'target') {
      if (voiceState === 'SPEAKING') {
        setCurrentCpm(localTargetCpm);
      } else {
        setCurrentCpm(0);
      }
    } else {
      // Free mode: calculate live estimated CPM based on scroll progress
      interval = window.setInterval(() => {
        if (voiceState === 'SPEAKING' && scrollRef.current && speakingTimeMsRef.current > 2000) {
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
          const maxScroll = Math.max(1, scrollHeight - clientHeight);
          // Assuming user manual scrolled, their progress is:
          const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
          const estWords = wordCountRef.current * progress;
          const live = Math.round(estWords / (speakingTimeMsRef.current / 60000));
          setCurrentCpm(live);
        } else if (voiceState === 'SILENCE') {
          setCurrentCpm(0);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [voiceState, localTargetCpm, prompterMode]);

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecDuration(prev => {
          const next = prev + 1;
          recDurationRef.current = next;
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Handle Play/Pause for Recording
  const togglePlay = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      if (!isPlaying) {
        if (recorder.state === 'inactive') {
          audioChunksRef.current = [];
          setRecDuration(0);
          recDurationRef.current = 0;
          recorder.start(1000);
        } else if (recorder.state === 'paused') {
          recorder.resume();
        }
        setIsRecording(true);
      } else {
        if (recorder.state === 'recording') {
          recorder.pause();
        }
        setIsRecording(false);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleFinish = () => {
    setIsPlaying(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setShowSummary(true);
  };

  // Clean up audio on unmount or close
  const handleClose = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsPlaying(false);

    if (totalTimeMsRef.current > 5000 && !showSummary) {
      const totalSecs = Math.round(totalTimeMsRef.current / 1000);
      const speakSecs = Math.round(speakingTimeMsRef.current / 1000);
      const avg = speakSecs > 0 ? Math.round(wordCountRef.current / (speakSecs / 60)) : 0;
      setStats({ totalTime: totalSecs, speakingTime: speakSecs, avgCpm: avg });
      setShowSummary(true);
      return;
    }

    streamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(()=>{});
    }
    onClose();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is interacting with some input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (showSummary) onClose();
        else handleFinish();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        if (scrollRef.current) scrollRef.current.scrollTop -= 60;
        handleManualScroll();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (scrollRef.current) scrollRef.current.scrollTop += 60;
        handleManualScroll();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleFinish, handleClose, handleManualScroll, showSummary, onClose]);



  // Dynamic Scroll Speed Calculation
  useEffect(() => {
    if (!textContainerRef.current || wordCountRef.current === 0 || prompterMode !== 'target') return;
    
    const updateSpeed = () => {
      const H = textContainerRef.current!.clientHeight;
      const totalSec = (wordCountRef.current / localTargetCpm) * 60;
      setPixelsPerSecond(totalSec > 0 ? H / totalSec : 0);
    };
    
    updateSpeed();
    // Use a small timeout to ensure fonts/layout are fully rendered
    setTimeout(updateSpeed, 100);
    window.addEventListener('resize', updateSpeed);
    return () => window.removeEventListener('resize', updateSpeed);
  }, [script, localTargetCpm, prompterMode, lang]);

  // Scrolling logic
  useEffect(() => {
    let scrollRequest: number;
    let lastTime = performance.now();
    
    const scroll = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      
      // Auto-scroll ONLY in target mode and when speed is calculated
      if (prompterMode === 'target' && isPlaying && voiceState === 'SPEAKING' && scrollRef.current && !manualScrollTimeout && pixelsPerSecond > 0) {
        const scrollAmount = (pixelsPerSecond * delta) / 1000;
        scrollRef.current.scrollTop += scrollAmount;
      }
      
      scrollRequest = requestAnimationFrame(scroll);
    };
    
    scrollRequest = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(scrollRequest);
  }, [isPlaying, voiceState, manualScrollTimeout, prompterMode, pixelsPerSecond]);

  const totalEstimatedSec = wordCountRef.current > 0 ? (wordCountRef.current / localTargetCpm) * 60 : 0;
  const timeMarkers = [];
  if (prompterMode === 'target' && totalEstimatedSec > 0) {
    for (let t = 15; t <= totalEstimatedSec + 30; t += 15) {
      timeMarkers.push(t);
    }
  }

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
      {/* Summary Modal */}
      <AnimatePresence>
        {showSummary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel"
              style={{ width: '400px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}
            >
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{lang === 'zh' ? '排练统计' : 'Session Summary'}</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{lang === 'zh' ? '实际用时' : 'Total Time'}</span>
                  <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{Math.floor(stats.totalTime / 60)}m {stats.totalTime % 60}s</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{lang === 'zh' ? '有效发声时长' : 'Speaking Time'}</span>
                  <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{Math.floor(stats.speakingTime / 60)}m {stats.speakingTime % 60}s</span>
                </div>
                <div style={{ height: '1px', background: 'var(--glass-border)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{lang === 'zh' ? '平均语速 (CPM/WPM)' : 'Average Speed'}</span>
                  <span style={{ fontWeight: 800, fontSize: '2rem', color: 'var(--accent-primary)' }}>{stats.avgCpm}</span>
                </div>
              </div>

              <button className="btn" style={{ width: '100%' }} onClick={handleClose}>
                {lang === 'zh' ? '完成' : 'Done'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable Rhythm Widget (Right) */}
      <motion.div 
        drag
        dragMomentum={false}
        className="glass-panel" 
        style={{ 
          position: 'absolute', top: '80px', right: '40px', zIndex: 100, 
          width: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
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
            {prompterMode === 'free' 
              ? (voiceState === 'SPEAKING' ? (lang === 'zh' ? '自由演讲中' : 'Speaking (Free Pace)') : (lang === 'zh' ? '检测停顿中' : 'Paused'))
              : (voiceState === 'SPEAKING' ? (lang === 'zh' ? '状态稳定' : 'Speaking') : (lang === 'zh' ? '检测停顿中' : 'Paused'))
            }
          </span>
          <button 
            className="btn-icon" 
            style={{ 
              background: isPlaying ? 'var(--accent-glow)' : 'rgba(255,255,255,0.05)',
              borderColor: isPlaying ? 'var(--accent-primary)' : 'var(--glass-border)',
              color: isPlaying ? 'white' : 'var(--text-primary)'
            }} 
            onClick={togglePlay}
          >
            {isPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-2px', color: 'var(--text-primary)' }}>
            {currentCpm}
          </span>
          <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {lang === 'zh' ? 'CPM' : 'WPM'} {prompterMode === 'free' && (lang === 'zh' ? '(动态)' : '(Est)')}
          </span>
        </div>

        {/* Speed Adjustment Slider (Only in Target Mode) */}
        {prompterMode === 'target' && (
          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Settings2 size={14} /> {lang === 'zh' ? '当前目标语速' : 'Target Speed'}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{localTargetCpm}</span>
            </div>
            <input 
              type="range" 
              min="80" max="350" 
              value={localTargetCpm} 
              onChange={(e) => setLocalTargetCpm(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
        )}
        {prompterMode === 'free' && (
          <div style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {lang === 'zh' ? '请手动滚动屏幕，系统将实时预估你的演讲语速。' : 'Manual scrolling. Speed is estimated based on your reading progress.'}
          </div>
        )}

        {/* Audio Visualizer */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', height: '40px', 
          alignItems: 'flex-end', opacity: voiceState === 'SPEAKING' ? 1 : 0.2,
          transition: 'opacity 0.3s ease',
          gap: '4px', marginTop: '8px'
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
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isRecording ? '#ef4444' : (isPlaying ? 'var(--status-stable)' : 'var(--status-pause)'), boxShadow: isRecording ? '0 0 10px #ef4444' : 'none' }} className={isRecording ? 'pulse' : ''} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h3 style={{ margin: 0, fontWeight: 600, letterSpacing: '2px', color: 'rgba(255,255,255,0.6)' }}>
              {isRecording ? 'REC' : (prompterMode === 'free' ? 'FREE PACE' : 'LIVE PROMPTER')}
            </h3>
            {isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: '12px' }}>
                <span style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '1px' }}>
                  {Math.floor(recDuration / 60).toString().padStart(2, '0')}:{Math.floor(recDuration % 60).toString().padStart(2, '0')}
                </span>
                
                {/* Professional Segmented VU Meter */}
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '16px', padding: '0 8px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                  {Array.from({ length: 24 }).map((_, i) => {
                    const currentVolume = audioData[audioData.length - 1];
                    const threshold = 15 + (i * 130 / 24); 
                    const isActive = currentVolume > threshold;
                    const isPeak = i >= 20;
                    const isWarning = i >= 15 && i < 20;
                    const color = isPeak ? '#ef4444' : (isWarning ? '#eab308' : '#22c55e');
                    
                    return (
                      <div key={i} style={{
                        width: '4px', 
                        height: isPeak ? '14px' : (isWarning ? '12px' : '10px'),
                        borderRadius: '2px',
                        backgroundColor: isActive ? color : 'rgba(255,255,255,0.15)',
                        boxShadow: isActive ? `0 0 10px ${color}` : 'none',
                        transition: 'all 0.05s ease-out',
                        opacity: isActive ? 1 : 0.5
                      }} />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', pointerEvents: 'auto' }}>
          <button className="btn-icon" onClick={() => setIsMirrored(!isMirrored)} title="Mirror Mode" style={{ background: isMirrored ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)', borderColor: isMirrored ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255,255,255,0.1)', color: isMirrored ? '#818cf8' : 'rgba(255,255,255,0.6)' }}>
            <FlipHorizontal size={22} />
          </button>
          <button className="btn-icon" onClick={handleFinish} title="Finish Session (ESC)" style={{ background: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.3)', color: '#4ade80' }}>
            <CheckCircle2 size={22} />
          </button>
          <button className="btn-icon" onClick={handleClose} style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Teleprompter Text Area */}
      <div 
        className="fade-mask"
        style={{ height: '100vh', width: '100%', display: 'flex', justifyContent: 'center' }}
      >
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)',
              zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
              cursor: 'pointer'
            }}
            onClick={togglePlay}
          >
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.2)', border: '2px solid var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.4)',
              backdropFilter: 'blur(10px)'
            }}>
              <Play size={48} fill="var(--accent-primary)" color="var(--accent-primary)" style={{ marginLeft: '8px' }} />
            </div>
          </motion.div>
        )}
        <div 
          ref={scrollRef}
          onWheel={handleManualScroll}
          onTouchMove={handleManualScroll}
          style={{ 
            width: '100%', maxWidth: '1000px',
            overflowY: 'auto', 
            fontSize: 'min(5.5vw, 72px)', 
            lineHeight: '1.6',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.95)',
            scrollBehavior: 'auto',
            transform: isMirrored ? 'scaleX(-1)' : 'none'
          }}
        >
          <div style={{ position: 'relative', padding: '50vh 40px' }}>
            {/* Background Time Markers */}
            {timeMarkers.map(t => (
              <div key={t} style={{
                position: 'absolute',
                top: `calc(50vh + ${t * pixelsPerSecond}px)`,
                left: 0,
                right: 0,
                borderTop: '2px dashed rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.15)',
                fontSize: '1.5rem',
                fontFamily: 'monospace',
                padding: '4px 40px',
                pointerEvents: 'none',
                zIndex: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span>{Math.floor(t / 60)}:{(t % 60).toString().padStart(2, '0')}</span>
              </div>
            ))}

            <div ref={textContainerRef} style={{ position: 'relative', zIndex: 1 }}>
              {script.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                <p key={i} style={{ 
                  marginBottom: '1.2em', 
                  textShadow: '0 4px 24px rgba(0,0,0,0.5)',
                  letterSpacing: lang === 'zh' ? '2px' : 'normal',
                  overflowWrap: 'break-word',
                  wordBreak: 'normal'
                }}>
                  {line}
                </p>
              ))}
            </div>
            {/* Larger spacer at the bottom to ensure the last word can clear the screen top */}
            <div style={{ height: '100vh' }} />
          </div>
        </div>
      </div>
      
      {/* Focus Line overlay */}
      {prompterMode === 'target' && (
        <div style={{
          position: 'absolute', top: '50%', left: '0', right: '0', height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.5) 50%, transparent 100%)',
          zIndex: 40, pointerEvents: 'none',
          transform: 'translateY(-50%)',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
        }} />
      )}
    </motion.div>
  );
}
