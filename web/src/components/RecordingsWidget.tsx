import './RecordingsWidget.css';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Download, Edit3, Mic2, Pause, Play, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store';
import type { Language, Recording } from '../types';

const copy = {
  zh: {
    title: '录音',
    count: (count: number) => `${count} 条`,
    open: '打开录音列表',
    close: '关闭录音列表',
    play: '播放录音',
    pause: '暂停录音',
    rename: '重命名录音',
    save: '保存名称',
    cancel: '取消编辑',
    download: '下载录音',
    remove: '删除录音',
    confirmRemove: '确定删除这条录音吗？此操作无法撤销。',
    local: '录音仅保存在当前浏览器',
    unnamed: '未命名录音'
  },
  en: {
    title: 'Recordings',
    count: (count: number) => `${count} saved`,
    open: 'Open recordings',
    close: 'Close recordings',
    play: 'Play recording',
    pause: 'Pause recording',
    rename: 'Rename recording',
    save: 'Save name',
    cancel: 'Cancel editing',
    download: 'Download recording',
    remove: 'Delete recording',
    confirmRemove: 'Delete this recording? This cannot be undone.',
    local: 'Recordings stay in this browser',
    unnamed: 'Untitled recording'
  }
} as const;

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function downloadExtension(mimeType?: string) {
  if (mimeType?.includes('mp4')) return 'm4a';
  if (mimeType?.includes('ogg')) return 'ogg';
  return 'webm';
}

interface RecordingItemProps {
  recording: Recording;
  lang: Language;
  activeId: string | null;
  onPlaybackChange: (id: string | null) => void;
}

function RecordingItem({ recording, lang, activeId, onPlaybackChange }: RecordingItemProps) {
  const deleteRecording = useAppStore((state) => state.deleteRecording);
  const setRecordings = useAppStore((state) => state.setRecordings);
  const text = copy[lang];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(recording.name);
  const isPlaying = activeId === recording.id;

  useEffect(() => {
    if (!recording.url) {
      audioRef.current = null;
      return;
    }
    const audio = new Audio(recording.url);
    audio.onended = () => onPlaybackChange(null);
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [onPlaybackChange, recording.url]);

  useEffect(() => {
    if (!isPlaying) audioRef.current?.pause();
  }, [isPlaying]);

  const togglePlayback = async () => {
    if (!recording.url) return;
    if (isPlaying) {
      audioRef.current?.pause();
      onPlaybackChange(null);
      return;
    }

    onPlaybackChange(recording.id);
    try {
      await audioRef.current?.play();
    } catch (error) {
      console.error('Recording playback failed:', error);
      onPlaybackChange(null);
    }
  };

  const saveName = () => {
    const nextName = editName.trim() || recording.name || text.unnamed;
    setRecordings((recordings) => recordings.map((item) => item.id === recording.id ? { ...item, name: nextName } : item));
    setEditName(nextName);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setEditName(recording.name);
    setIsEditing(false);
  };

  const removeRecording = () => {
    if (!window.confirm(text.confirmRemove)) return;
    if (isPlaying) onPlaybackChange(null);
    deleteRecording(recording.id);
  };

  const createdLabel = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(recording.createdAt);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`recording-row ${isPlaying ? 'is-playing' : ''}`}
    >
      <button
        type="button"
        className="recording-play"
        onClick={() => void togglePlayback()}
        disabled={!recording.url}
        aria-label={isPlaying ? text.pause : text.play}
      >
        {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
      </button>

      <div className="recording-main">
        {isEditing ? (
          <div className="recording-edit-row">
            <input
              autoFocus
              type="text"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveName();
                if (event.key === 'Escape') cancelEditing();
              }}
              aria-label={text.rename}
            />
            <button type="button" className="recording-inline-action confirm" onClick={saveName} aria-label={text.save}><Check size={14} /></button>
            <button type="button" className="recording-inline-action" onClick={cancelEditing} aria-label={text.cancel}><X size={14} /></button>
          </div>
        ) : (
          <div className="recording-title-row">
            <strong title={recording.name}>{recording.name || text.unnamed}</strong>
            <button type="button" className="recording-inline-action" onClick={() => setIsEditing(true)} aria-label={text.rename}><Edit3 size={13} /></button>
          </div>
        )}
        <span className="recording-meta">{formatDuration(recording.durationSec)} · {createdLabel}</span>
      </div>

      <div className="recording-actions">
        <a
          className={`recording-action ${!recording.url ? 'is-disabled' : ''}`}
          href={recording.url || undefined}
          download={`${recording.name || text.unnamed}.${downloadExtension(recording.mimeType)}`}
          aria-label={text.download}
          aria-disabled={!recording.url}
          onClick={(event) => { if (!recording.url) event.preventDefault(); }}
        >
          <Download size={16} />
        </a>
        <button type="button" className="recording-action danger" onClick={removeRecording} aria-label={text.remove}>
          <Trash2 size={16} />
        </button>
      </div>
    </motion.article>
  );
}

export function RecordingsWidget() {
  const recordings = useAppStore((state) => state.recordings);
  const lang = useAppStore((state) => state.globalLang);
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const text = copy[lang];

  useEffect(() => {
    if (!isOpen) setActiveId(null);
  }, [isOpen]);

  if (recordings.length === 0) return null;

  return (
    <div className="recordings-dock">
      <AnimatePresence>
        {isOpen && (
          <motion.section
            id="recordings-panel"
            className="recordings-panel"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            aria-label={text.title}
          >
            <header className="recordings-panel-header">
              <div>
                <span className="recordings-eyebrow">{text.count(recordings.length)}</span>
                <h2>{text.title}</h2>
              </div>
              <button type="button" className="btn-icon recordings-close" onClick={() => setIsOpen(false)} aria-label={text.close}>
                <X size={17} />
              </button>
            </header>

            <div className="recordings-list">
              <AnimatePresence initial={false}>
                {recordings.map((recording) => (
                  <RecordingItem
                    key={recording.id}
                    recording={recording}
                    lang={lang}
                    activeId={activeId}
                    onPlaybackChange={setActiveId}
                  />
                ))}
              </AnimatePresence>
            </div>

            <footer className="recordings-panel-footer">{text.local}</footer>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        type="button"
        className={`recordings-launcher ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-controls="recordings-panel"
        aria-label={isOpen ? text.close : text.open}
      >
        <Mic2 size={19} />
        <span>{text.title}</span>
        <strong>{recordings.length}</strong>
      </button>
    </div>
  );
}
