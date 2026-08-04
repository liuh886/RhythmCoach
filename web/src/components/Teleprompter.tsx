import './Teleprompter.css';
import './DeliveryCues.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CheckCircle2, FlipHorizontal, Gauge, Mic, Pause, Play, RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { DSP_PRESETS, classifyInputLevel, getExpanderTargetGain, getRecorderOptions, type InputLevelStatus } from '../domain/audioDsp';
import { isDeliveryMarkupAligned, parseDeliveryMarkup, stripDeliveryMarkup, type DeliveryCueKind } from '../domain/deliveryMarkup';
import { buildTimeMarkers } from '../domain/prompterTimeline';
import { buildSessionMetrics, compareSessions, countScriptUnits, createScriptKey, estimateDeliveryPace, getScrollCompletion } from '../domain/sessionMetrics';
import { useAppStore } from '../store';
import type { Language, PracticeSession, PrompterMode, SessionComparison, SessionStatus } from '../types';

interface TeleprompterProps {
  title: string;
  script: string;
  deliveryMarkup: string;
  targetPace: number;
  lang: Language;
  prompterMode: PrompterMode;
  onClose: () => void;
}

type VoiceState = 'SPEAKING' | 'SILENCE' | 'UNAVAILABLE';

interface RecordingMeta {
  sessionId?: string;
  durationSec: number;
}

const LONG_PAUSE_MS = 1500;
const SPEECH_GRACE_MS = 650;
const createId = () => crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;

const formatDuration = (milliseconds: number) => {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

function comparisonSentence(comparison: SessionComparison | null, lang: Language): string {
  if (!comparison) return lang === 'zh' ? '这是该稿件的第一次可比较练习。' : 'This is the first comparable rehearsal for this script.';
  const improvements: string[] = [];
  if (comparison.longPauseDelta < 0) improvements.push(lang === 'zh' ? `长停顿减少 ${Math.abs(comparison.longPauseDelta)} 次` : `${Math.abs(comparison.longPauseDelta)} fewer long pauses`);
  if (comparison.completionDelta > 0.03) improvements.push(lang === 'zh' ? `完成度提高 ${Math.round(comparison.completionDelta * 100)}%` : `${Math.round(comparison.completionDelta * 100)}% higher completion`);
  if (improvements.length > 0) return improvements.join(lang === 'zh' ? '，' : ', ');
  return lang === 'zh' ? '本次与上次整体接近，可继续关注长停顿和完成度。' : 'This attempt is close to the previous one; focus on long pauses and completion.';
}

function cueLabel(cue: DeliveryCueKind, lang: Language): string {
  if (lang === 'zh') {
    return cue === 'short-pause' ? '短停顿' : cue === 'long-pause' ? '长停顿' : '建议换气';
  }
  return cue === 'short-pause' ? 'Short pause' : cue === 'long-pause' ? 'Long pause' : 'Suggested breath';
}

function DeliveryLine({ markup, lang }: { markup: string; lang: Language }) {
  return (
    <>
      {parseDeliveryMarkup(markup).map((token, index) => {
        if (token.kind === 'text') {
          return token.emphasis
            ? <span key={`${index}_${token.text.slice(0, 8)}`} className="delivery-emphasis">{token.text}</span>
            : <span key={`${index}_${token.text.slice(0, 8)}`}>{token.text}</span>;
        }
        const label = cueLabel(token.cue, lang);
        return <span key={`${index}_${token.cue}`} className={`delivery-cue delivery-cue-${token.cue}`} role="img" aria-label={label} title={label} />;
      })}
    </>
  );
}

function configureCompressor(node: DynamicsCompressorNode, preset: NonNullable<(typeof DSP_PRESETS)['podcast']['compressor']>) {
  node.threshold.value = preset.threshold;
  node.knee.value = preset.knee;
  node.ratio.value = preset.ratio;
  node.attack.value = preset.attack;
  node.release.value = preset.release;
}

export function Teleprompter({ title, script, deliveryMarkup, targetPace, lang, prompterMode, onClose }: TeleprompterProps) {
  const addRecording = useAppStore((state) => state.addRecording);
  const discardRecordingsForSession = useAppStore((state) => state.discardRecordingsForSession);
  const addSession = useAppStore((state) => state.addSession);
  const sessions = useAppStore((state) => state.sessions);
  const audioProfile = useAppStore((state) => state.audioProfile);

  const [status, setStatus] = useState<SessionStatus>('idle');
  const [voiceState, setVoiceState] = useState<VoiceState>('UNAVAILABLE');
  const [inputLevelStatus, setInputLevelStatus] = useState<InputLevelStatus>('waiting');
  const [isMirrored, setIsMirrored] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [liveEstimatedPace, setLiveEstimatedPace] = useState(0);
  const [liveProgress, setLiveProgress] = useState(0);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(0);
  const [audioMessage, setAudioMessage] = useState('');
  const [completedSession, setCompletedSession] = useState<PracticeSession | null>(null);
  const [comparison, setComparison] = useState<SessionComparison | null>(null);

  const statusRef = useRef<SessionStatus>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingMetaRef = useRef<RecordingMeta | null>(null);
  const discardedRecordingSessionIdsRef = useRef(new Set<string>());
  const audioRafRef = useRef(0);
  const clockRafRef = useRef(0);
  const scrollRafRef = useRef(0);
  const totalTimeRef = useRef(0);
  const speakingTimeRef = useRef(0);
  const longPauseCountRef = useRef(0);
  const silenceStartRef = useRef(0);
  const longPauseCountedRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const noiseFloorRef = useRef(0.008);
  const startedAtRef = useRef(0);
  const currentSessionIdRef = useRef('');
  const savedRef = useRef(false);
  const manualScrollUntilRef = useRef(0);
  const previousVoiceRef = useRef<VoiceState>('UNAVAILABLE');

  const totalUnits = useMemo(() => countScriptUnits(script, lang), [lang, script]);
  const scriptKey = useMemo(() => createScriptKey(title, script, lang), [lang, script, title]);
  const activeDeliveryMarkup = useMemo(
    () => isDeliveryMarkupAligned(deliveryMarkup, script) ? deliveryMarkup : script,
    [deliveryMarkup, script]
  );
  const hasDeliveryCues = activeDeliveryMarkup !== script;
  const deliveryParagraphs = useMemo(
    () => activeDeliveryMarkup.split('\n').filter((line) => stripDeliveryMarkup(line).trim()),
    [activeDeliveryMarkup]
  );
  const targetDurationSeconds = useMemo(
    () => prompterMode === 'timed' && targetPace > 0 ? (totalUnits / targetPace) * 60 : 0,
    [prompterMode, targetPace, totalUnits]
  );
  const timeMarkers = useMemo(() => buildTimeMarkers(targetDurationSeconds), [targetDurationSeconds]);
  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  const updateStatus = useCallback((next: SessionStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const captureRecordingMeta = useCallback(() => {
    if (recordingMetaRef.current) return;
    recordingMetaRef.current = {
      sessionId: currentSessionIdRef.current || undefined,
      durationSec: Math.round(totalTimeRef.current / 1000)
    };
  }, []);

  const cleanupAudio = useCallback(() => {
    if (audioRafRef.current) cancelAnimationFrame(audioRafRef.current);
    audioRafRef.current = 0;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      captureRecordingMeta();
      try {
        recorderRef.current.stop();
      } catch {
        // Recorder is already stopping.
      }
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') void audioContextRef.current.close();
    audioContextRef.current = null;
  }, [captureRecordingMeta]);

  useEffect(() => () => {
    if (clockRafRef.current) cancelAnimationFrame(clockRafRef.current);
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    cleanupAudio();
  }, [cleanupAudio]);

  const prepareAudio = useCallback(async (): Promise<boolean> => {
    if (audioContextRef.current && streamRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceState('UNAVAILABLE');
      setAudioMessage(lang === 'zh' ? '当前浏览器不支持麦克风分析。' : 'Microphone analysis is not supported in this browser.');
      return false;
    }

    updateStatus('requesting_permission');
    setInputLevelStatus('waiting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: false },
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48_000 }
        }
      });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('AudioContext unavailable');

      const context = new AudioContextClass();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const recordingDestination = context.createMediaStreamDestination();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;

      source.connect(analyser);

      const preset = DSP_PRESETS[audioProfile];
      let recordingOutput: AudioNode = source;
      let expanderGain: GainNode | null = null;
      let expanderTargetGain = 1;

      if (preset.highpassHz !== null) {
        const highpass = context.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = preset.highpassHz;
        highpass.Q.value = preset.highpassQ;
        recordingOutput.connect(highpass);
        recordingOutput = highpass;
      }

      if (preset.expander) {
        expanderGain = context.createGain();
        expanderGain.gain.value = 1;
        recordingOutput.connect(expanderGain);
        recordingOutput = expanderGain;
      }

      if (preset.presenceHz !== null) {
        const presence = context.createBiquadFilter();
        presence.type = 'peaking';
        presence.frequency.value = preset.presenceHz;
        presence.Q.value = preset.presenceQ;
        presence.gain.value = preset.presenceGainDb;
        recordingOutput.connect(presence);
        recordingOutput = presence;
      }

      if (preset.compressor) {
        const compressor = context.createDynamicsCompressor();
        configureCompressor(compressor, preset.compressor);
        recordingOutput.connect(compressor);
        recordingOutput = compressor;
      }

      if (preset.limiter) {
        const limiter = context.createDynamicsCompressor();
        configureCompressor(limiter, preset.limiter);
        recordingOutput.connect(limiter);
        recordingOutput = limiter;
      }

      recordingOutput.connect(recordingDestination);

      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = mimeCandidates.find((candidate) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate));

      if (typeof MediaRecorder !== 'undefined') {
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(recordingDestination.stream, getRecorderOptions(mimeType));
        } catch {
          recorder = new MediaRecorder(recordingDestination.stream, mimeType ? { mimeType } : undefined);
        }
        const recorderChunks: Blob[] = [];
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) recorderChunks.push(event.data);
        };
        recorder.onstop = () => {
          const meta = recordingMetaRef.current;
          recordingMetaRef.current = null;
          const sessionId = meta?.sessionId;
          if (sessionId && discardedRecordingSessionIdsRef.current.has(sessionId)) {
            discardedRecordingSessionIdsRef.current.delete(sessionId);
            recorderChunks.length = 0;
            return;
          }
          if (recorderChunks.length === 0) return;
          const blob = new Blob(recorderChunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
          addRecording({
            id: createId(),
            sessionId,
            url: URL.createObjectURL(blob),
            name: `${title || 'RhythmCoach'}_${new Date().toLocaleTimeString().replace(/:/g, '-')}`,
            durationSec: meta?.durationSec ?? Math.round(totalTimeRef.current / 1000),
            blob,
            mimeType: blob.type,
            createdAt: Date.now()
          });
          recorderChunks.length = 0;
        };
      }

      const data = new Uint8Array(analyser.fftSize);
      let lastFrame = performance.now();
      let lastUiUpdate = 0;

      const analyse = (time: number) => {
        const delta = Math.min(250, Math.max(0, time - lastFrame));
        lastFrame = time;
        analyser.getByteTimeDomainData(data);

        let sum = 0;
        let peak = 0;
        for (let index = 0; index < data.length; index += 1) {
          const amplitude = (data[index] - 128) / 128;
          const absoluteAmplitude = Math.abs(amplitude);
          sum += amplitude * amplitude;
          if (absoluteAmplitude > peak) peak = absoluteAmplitude;
        }

        const rms = Math.sqrt(sum / data.length);
        const threshold = Math.max(0.015, noiseFloorRef.current * 2.6);
        const detectedSpeech = rms > threshold;
        let speakingNow = detectedSpeech;
        let silenceDuration = 0;

        if (!detectedSpeech) {
          noiseFloorRef.current = noiseFloorRef.current * 0.97 + rms * 0.03;
          if (silenceStartRef.current === 0) silenceStartRef.current = time;
          silenceDuration = time - silenceStartRef.current;
          speakingNow = silenceDuration < SPEECH_GRACE_MS;
          if (hasSpokenRef.current && silenceDuration >= LONG_PAUSE_MS && !longPauseCountedRef.current && statusRef.current === 'running') {
            longPauseCountRef.current += 1;
            longPauseCountedRef.current = true;
          }
        } else {
          hasSpokenRef.current = true;
          silenceStartRef.current = 0;
          longPauseCountedRef.current = false;
        }

        if (expanderGain && preset.expander) {
          const nextExpanderTarget = getExpanderTargetGain(preset.expander, detectedSpeech, silenceDuration);
          if (nextExpanderTarget !== expanderTargetGain) {
            expanderTargetGain = nextExpanderTarget;
            const now = context.currentTime;
            const currentGain = expanderGain.gain.value;
            expanderGain.gain.cancelScheduledValues(now);
            expanderGain.gain.setValueAtTime(currentGain, now);
            expanderGain.gain.setTargetAtTime(
              nextExpanderTarget,
              now,
              nextExpanderTarget === 1 ? preset.expander.openTimeConstant : preset.expander.closeTimeConstant
            );
          }
        }

        const nextVoice: VoiceState = speakingNow ? 'SPEAKING' : 'SILENCE';
        if (nextVoice !== previousVoiceRef.current) {
          previousVoiceRef.current = nextVoice;
          setVoiceState(nextVoice);
        }
        if (statusRef.current === 'running' && speakingNow) speakingTimeRef.current += delta;

        if (time - lastUiUpdate > 80) {
          setAudioLevel(Math.min(1, Math.max(rms * 10, peak * 0.8)));
          if (detectedSpeech || peak > 0.04) {
            setInputLevelStatus(classifyInputLevel(rms, peak, noiseFloorRef.current));
          } else if (noiseFloorRef.current >= 0.025) {
            setInputLevelStatus('noisy');
          }
          lastUiUpdate = time;
        }

        audioRafRef.current = requestAnimationFrame(analyse);
      };

      audioRafRef.current = requestAnimationFrame(analyse);
      setAudioMessage('');
      setVoiceState('SILENCE');
      updateStatus('ready');
      return true;
    } catch (error) {
      console.error('Microphone setup failed:', error);
      setVoiceState('UNAVAILABLE');
      setAudioMessage(lang === 'zh' ? '无法使用麦克风。定时和播客模式仍可继续，但语音跟随不可用。' : 'Microphone unavailable. Timed and podcast modes can continue; voice-follow mode cannot.');
      updateStatus('error');
      return false;
    }
  }, [addRecording, audioProfile, lang, title, updateStatus]);

  useEffect(() => {
    let lastFrame = performance.now();
    let lastUi = 0;
    const tick = (time: number) => {
      const delta = Math.min(250, Math.max(0, time - lastFrame));
      lastFrame = time;
      if (statusRef.current === 'running') totalTimeRef.current += delta;
      if (time - lastUi > 250) {
        setElapsedMs(totalTimeRef.current);
        const progress = getScrollCompletion(scrollRef.current);
        setLiveProgress(progress);
        const completedUnits = Math.round(totalUnits * progress);
        setLiveEstimatedPace(estimateDeliveryPace(completedUnits, totalTimeRef.current));
        lastUi = time;
      }
      clockRafRef.current = requestAnimationFrame(tick);
    };
    clockRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(clockRafRef.current);
  }, [totalUnits]);

  useEffect(() => {
    const updateScrollSpeed = () => {
      const element = scrollRef.current;
      if (!element || prompterMode === 'free' || targetPace <= 0 || totalUnits === 0) {
        setPixelsPerSecond(0);
        return;
      }
      const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
      const targetSeconds = (totalUnits / targetPace) * 60;
      setPixelsPerSecond(targetSeconds > 0 ? maxScroll / targetSeconds : 0);
    };
    updateScrollSpeed();
    const timeout = window.setTimeout(updateScrollSpeed, 120);
    window.addEventListener('resize', updateScrollSpeed);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('resize', updateScrollSpeed);
    };
  }, [prompterMode, script, targetPace, totalUnits]);

  useEffect(() => {
    let lastFrame = performance.now();
    const scroll = (time: number) => {
      const delta = Math.min(100, Math.max(0, time - lastFrame));
      lastFrame = time;
      const shouldAutoScroll = statusRef.current === 'running'
        && prompterMode !== 'free'
        && time >= manualScrollUntilRef.current
        && pixelsPerSecond > 0
        && (prompterMode === 'timed' || voiceState === 'SPEAKING');
      if (shouldAutoScroll && scrollRef.current) scrollRef.current.scrollTop += (pixelsPerSecond * delta) / 1000;
      scrollRafRef.current = requestAnimationFrame(scroll);
    };
    scrollRafRef.current = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(scrollRafRef.current);
  }, [pixelsPerSecond, prompterMode, voiceState]);

  const startOrResume = useCallback(async () => {
    if (statusRef.current === 'running' || statusRef.current === 'finishing' || statusRef.current === 'completed') return;
    if (!startedAtRef.current) {
      startedAtRef.current = Date.now();
      currentSessionIdRef.current = createId();
      savedRef.current = false;
    }
    let audioReady = Boolean(audioContextRef.current);
    if (!audioReady) audioReady = await prepareAudio();
    if (!audioReady && prompterMode === 'follow') {
      updateStatus('error');
      return;
    }
    silenceStartRef.current = 0;
    longPauseCountedRef.current = false;
    const recorder = recorderRef.current;
    if (recorder) {
      if (recorder.state === 'inactive') {
        recordingMetaRef.current = null;
        recorder.start(1000);
      } else if (recorder.state === 'paused') {
        recorder.resume();
      }
    }
    updateStatus('running');
  }, [prepareAudio, prompterMode, updateStatus]);

  const pauseSession = useCallback(() => {
    if (statusRef.current !== 'running') return;
    if (recorderRef.current?.state === 'recording') recorderRef.current.pause();
    silenceStartRef.current = 0;
    longPauseCountedRef.current = false;
    updateStatus('paused');
  }, [updateStatus]);

  const finishSession = useCallback(() => {
    if (savedRef.current || statusRef.current === 'finishing' || statusRef.current === 'completed') return;
    if (!startedAtRef.current || totalTimeRef.current < 500) {
      setAudioMessage(lang === 'zh' ? '请先开始训练，再生成复盘。' : 'Start the rehearsal before creating a summary.');
      if (statusRef.current !== 'error') updateStatus('idle');
      return;
    }
    updateStatus('finishing');
    const endedAt = Date.now();
    const completionRatio = getScrollCompletion(scrollRef.current);
    const metrics = buildSessionMetrics({
      totalTimeMs: totalTimeRef.current,
      speakingTimeMs: speakingTimeRef.current,
      longPauseCount: longPauseCountRef.current,
      completionRatio,
      totalUnits,
      targetPace: prompterMode === 'free' ? null : targetPace,
      lang
    });
    const session: PracticeSession = {
      id: currentSessionIdRef.current || createId(),
      scriptKey,
      scriptTitle: title,
      scriptSnapshot: script,
      lang,
      mode: prompterMode,
      startedAt: startedAtRef.current || endedAt,
      endedAt,
      metrics
    };
    const previous = sessions.find((item) => item.scriptKey === scriptKey);
    setComparison(previous ? compareSessions(session, previous) : null);
    addSession(session);
    savedRef.current = true;
    setCompletedSession(session);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      captureRecordingMeta();
      recorderRef.current.stop();
    }
    updateStatus('completed');
  }, [addSession, captureRecordingMeta, lang, prompterMode, script, scriptKey, sessions, targetPace, title, totalUnits, updateStatus]);

  const resetSession = useCallback(() => {
    const completedSessionId = completedSession?.id;
    if (completedSessionId) {
      discardedRecordingSessionIdsRef.current.add(completedSessionId);
      discardRecordingsForSession(completedSessionId);
    }
    cleanupAudio();
    totalTimeRef.current = 0;
    speakingTimeRef.current = 0;
    longPauseCountRef.current = 0;
    silenceStartRef.current = 0;
    longPauseCountedRef.current = false;
    hasSpokenRef.current = false;
    noiseFloorRef.current = 0.008;
    startedAtRef.current = 0;
    currentSessionIdRef.current = '';
    savedRef.current = false;
    manualScrollUntilRef.current = 0;
    previousVoiceRef.current = 'UNAVAILABLE';
    setElapsedMs(0);
    setLiveEstimatedPace(0);
    setLiveProgress(0);
    setAudioLevel(0);
    setAudioMessage('');
    setInputLevelStatus('waiting');
    setVoiceState('UNAVAILABLE');
    setCompletedSession(null);
    setComparison(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    updateStatus('idle');
  }, [cleanupAudio, completedSession, discardRecordingsForSession, updateStatus]);

  const close = useCallback(() => {
    if (statusRef.current === 'completed' || totalTimeRef.current < 1000) {
      cleanupAudio();
      onClose();
      return;
    }
    finishSession();
  }, [cleanupAudio, finishSession, onClose]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (statusRef.current === 'running') pauseSession();
        else if (statusRef.current !== 'completed') void startOrResume();
      } else if (event.code === 'Escape') {
        event.preventDefault();
        if (statusRef.current === 'completed') {
          cleanupAudio();
          onClose();
        } else {
          finishSession();
        }
      } else if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
        event.preventDefault();
        manualScrollUntilRef.current = performance.now() + 1500;
        if (scrollRef.current) scrollRef.current.scrollTop += event.code === 'ArrowDown' ? 70 : -70;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cleanupAudio, finishSession, onClose, pauseSession, startOrResume]);

  const manualScroll = () => {
    manualScrollUntilRef.current = performance.now() + 1500;
  };

  const modeLabel = lang === 'zh'
    ? prompterMode === 'timed' ? '定时提词' : prompterMode === 'follow' ? '语音跟随' : '播客训练'
    : prompterMode === 'timed' ? 'Timed' : prompterMode === 'follow' ? 'Voice Follow' : 'Podcast';
  const paceValue = prompterMode === 'free' ? liveEstimatedPace : targetPace;
  const paceLabel = prompterMode === 'free' ? (lang === 'zh' ? '整体语速' : 'Delivery pace') : (lang === 'zh' ? '目标语速' : 'Target pace');
  const statusLabel = lang === 'zh'
    ? ({ idle: '待开始', requesting_permission: '请求权限', ready: '已就绪', running: '训练中', paused: '已暂停', finishing: '生成复盘', completed: '已完成', error: '麦克风不可用' } as Record<SessionStatus, string>)[status]
    : status.replaceAll('_', ' ');
  const inputLevelText: Record<InputLevelStatus, string> = lang === 'zh'
    ? {
        waiting: '说一句话检查输入',
        low: '输入偏小，请靠近麦克风',
        good: '输入电平良好',
        hot: '输入过强，请稍微远离',
        noisy: '环境噪声较高'
      }
    : {
        waiting: 'Speak to check the input',
        low: 'Input is low; move closer',
        good: 'Input level is good',
        hot: 'Input is hot; move back',
        noisy: 'Background noise is high'
      };
  const isBusy = status === 'requesting_permission' || status === 'finishing';
  const primaryActionLabel = isRunning || isPaused
    ? (lang === 'zh' ? '完成训练' : 'Finish')
    : (lang === 'zh' ? '开始训练' : 'Start');

  return (
    <motion.div className="prompter-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <header className="prompter-topbar">
        <div className="session-state">
          <span className={`status-dot ${isRunning ? 'running' : ''}`} />
          <div><strong>{title || modeLabel}</strong><span>{modeLabel} · {formatDuration(elapsedMs)} · {statusLabel}</span></div>
        </div>
        <div className="top-actions">
          <button className="btn-icon" onClick={() => setIsMirrored((value) => !value)} title={lang === 'zh' ? '镜像文字' : 'Mirror text'} aria-label={lang === 'zh' ? '镜像文字' : 'Mirror text'}><FlipHorizontal size={19} /></button>
          <button className="btn-icon close-button" onClick={close} title={lang === 'zh' ? '退出训练' : 'Exit rehearsal'} aria-label={lang === 'zh' ? '退出训练' : 'Exit rehearsal'}><X size={20} /></button>
        </div>
      </header>

      <motion.aside drag dragMomentum={false} dragElastic={0.06} className={`pace-panel ${isRunning ? 'is-running' : ''}`}>
        <div className="hud-header">
          <span className={`voice-label ${voiceState.toLowerCase()}`}>
            <Activity size={15} />
            {voiceState === 'SPEAKING' ? (lang === 'zh' ? '讲话' : 'Speaking') : voiceState === 'SILENCE' ? (lang === 'zh' ? '停顿' : 'Silence') : (lang === 'zh' ? '无麦克风' : 'No mic')}
          </span>
          {hasDeliveryCues && <span className="delivery-cue-active">{lang === 'zh' ? '朗读标注' : 'Cues'}</span>}
        </div>
        <div className="hud-readout">
          <div className="hud-metric primary">
            <span><Gauge size={13} /> {paceLabel}</span>
            <div><strong>{paceValue || '—'}</strong><small>{lang === 'zh' ? 'CPM' : 'WPM'}</small></div>
          </div>
          <div className="hud-metric">
            <span>{prompterMode === 'free'
              ? (lang === 'zh' ? '内容进度' : 'Content progress')
              : (lang === 'zh' ? '正文进度' : 'Progress')}</span>
            <strong>{Math.round(liveProgress * 100)}%</strong>
          </div>
        </div>
        <div className="audio-meter" aria-label="audio level">{Array.from({ length: 14 }).map((_, index) => <span key={index} className={audioLevel * 14 > index ? 'active' : ''} />)}</div>
        {voiceState !== 'UNAVAILABLE' && <div className={`input-level-status ${inputLevelStatus}`}><Mic size={13} /> {inputLevelText[inputLevelStatus]}</div>}
        {audioMessage && <div className="audio-warning"><Mic size={14} /> {audioMessage}</div>}
        <div className="session-controls">
          {(isRunning || isPaused) && (
            <button
              type="button"
              className="btn-icon session-control-secondary"
              onClick={() => isRunning ? pauseSession() : void startOrResume()}
              title={isRunning ? (lang === 'zh' ? '暂停训练' : 'Pause') : (lang === 'zh' ? '继续训练' : 'Resume')}
              aria-label={isRunning ? (lang === 'zh' ? '暂停训练' : 'Pause') : (lang === 'zh' ? '继续训练' : 'Resume')}
            >
              {isRunning ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
            </button>
          )}
          <button
            type="button"
            className={`session-control-primary ${isRunning || isPaused ? 'is-finish' : ''}`}
            onClick={() => isRunning || isPaused ? finishSession() : void startOrResume()}
            disabled={isBusy}
          >
            {isRunning || isPaused ? <CheckCircle2 size={18} /> : <Play size={18} fill="currentColor" />}
            <span>{isBusy ? (lang === 'zh' ? '请稍候' : 'Please wait') : primaryActionLabel}</span>
          </button>
        </div>
      </motion.aside>

      <div className="prompter-frame">
        <div ref={scrollRef} className={`prompter-scroll ${isMirrored ? 'mirrored' : ''}`} onWheel={manualScroll} onTouchMove={manualScroll} onScroll={prompterMode === 'free' ? manualScroll : undefined}>
          <div className="prompter-padding">
            <div className={`prompter-script-stage ${prompterMode === 'timed' ? 'with-time-ruler' : ''}`}>
              {prompterMode === 'timed' && timeMarkers.length > 0 && (
                <div className="time-ruler" aria-label={lang === 'zh' ? '目标时间标尺' : 'Target timeline'}>
                  <span className="time-ruler-track" />
                  {timeMarkers.map((marker) => (
                    <div
                      key={`${marker.seconds}_${marker.label}`}
                      className={`time-marker ${marker.major ? 'major' : ''}`}
                      style={{ top: `${marker.progress * 100}%` }}
                    >
                      <span>{marker.label}</span><i />
                    </div>
                  ))}
                </div>
              )}
              <div className="prompter-text">
                {deliveryParagraphs.map((line, index) => (
                  <p key={`${index}_${stripDeliveryMarkup(line).slice(0, 12)}`}><DeliveryLine markup={line} lang={lang} /></p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {completedSession && (
          <motion.div className="summary-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="summary-modal glass-panel" initial={{ scale: .94, y: 16 }} animate={{ scale: 1, y: 0 }}>
              <h2>{lang === 'zh' ? '本次训练完成' : 'Rehearsal complete'}</h2>
              <p className="summary-note">{lang === 'zh' ? '整体估算语速按已完成文本与实际训练用时计算，包含自然停顿和呼吸；它仍不等同于逐字语音识别结果。' : 'Estimated delivery pace uses completed text and total rehearsal time, including natural pauses and breaths; it is still not word-level speech recognition.'}</p>
              <div className="summary-grid">
                <div><span>{lang === 'zh' ? '实际用时' : 'Total time'}</span><strong>{formatDuration(completedSession.metrics.totalTimeMs)}</strong></div>
                <div><span>{lang === 'zh' ? '有效发声' : 'Speaking time'}</span><strong>{formatDuration(completedSession.metrics.speakingTimeMs)}</strong></div>
                <div><span>{lang === 'zh' ? '完成度' : 'Completion'}</span><strong>{Math.round(completedSession.metrics.completionRatio * 100)}%</strong></div>
                <div><span>{lang === 'zh' ? '长停顿' : 'Long pauses'}</span><strong>{completedSession.metrics.longPauseCount}</strong></div>
                <div><span>{lang === 'zh' ? '整体估算语速' : 'Estimated delivery pace'}</span><strong>{completedSession.metrics.estimatedPace || '—'} {completedSession.metrics.paceUnit}</strong></div>
                <div><span>{lang === 'zh' ? '发声占比' : 'Speaking ratio'}</span><strong>{Math.round(completedSession.metrics.speakingRatio * 100)}%</strong></div>
              </div>
              <div className="comparison-callout"><strong>{lang === 'zh' ? '与上次相比' : 'Compared with previous'}</strong><span>{comparisonSentence(comparison, lang)}</span></div>
              <div className="summary-actions">
                <button className="btn btn-secondary" onClick={() => { cleanupAudio(); onClose(); }}>{lang === 'zh' ? '返回训练记录' : 'Return to history'}</button>
                <button className="btn" onClick={resetSession} title={lang === 'zh' ? '重新开始并丢弃本次录音' : 'Restart and discard this recording'}><RotateCcw size={18} />{lang === 'zh' ? '重新开始' : 'Restart'}</button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
