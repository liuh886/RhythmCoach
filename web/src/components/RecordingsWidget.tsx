import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Edit2, Play, Pause } from 'lucide-react';
import { Recording } from '../types';
import { useAppStore } from '../store';

function RecordingItem({ 
  rec 
}: { 
  rec: Recording; 
}) {
  const deleteRecording = useAppStore(state => state.deleteRecording);
  const setRecordings = useAppStore(state => state.setRecordings);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(rec.url);
    audio.onended = () => setIsPlaying(false);
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [rec.url]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play();
      setIsPlaying(true);
    }
  };

  const handleEdit = () => {
    setEditingId(rec.id);
    setEditName(rec.name);
  };

  const handleSaveEdit = () => {
    setRecordings(prev => prev.map(r => r.id === rec.id ? { ...r, name: editName || r.name } : r));
    setEditingId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -50, scale: 0.8 }}
      className="glass-panel"
      style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px',
        background: 'rgba(24, 24, 27, 0.85)', border: '1px solid var(--glass-highlight)',
        pointerEvents: 'auto'
      }}
      onPointerDownCapture={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('a')) {
          e.stopPropagation();
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
        <button 
          onClick={togglePlay} 
          className="btn-icon"
          style={{ width: '32px', height: '32px', padding: 0, background: isPlaying ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)', color: isPlaying ? '#38bdf8' : 'var(--text-primary)' }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }}/>}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {editingId === rec.id ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input 
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                onBlur={handleSaveEdit}
                style={{ 
                  background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', 
                  color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem', width: '120px'
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{rec.name}</span>
              <button onClick={handleEdit} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                <Edit2 size={12} />
              </button>
            </div>
          )}
          
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {Math.floor(rec.durationSec / 60)}:{(rec.durationSec % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <a 
          href={rec.url} 
          download={`${rec.name}.webm`}
          className="btn-icon" 
          style={{ width: '32px', height: '32px', background: 'rgba(167, 139, 250, 0.1)', color: 'var(--accent-primary)', borderColor: 'rgba(167, 139, 250, 0.2)' }}
          title="Download"
          draggable={false}
        >
          <Download size={16} />
        </a>
        <button 
          onClick={() => deleteRecording(rec.id)}
          className="btn-icon" 
          style={{ width: '32px', height: '32px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}

export function RecordingsWidget() {
  const recordings = useAppStore(state => state.recordings);

  if (recordings.length === 0) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      style={{
        position: 'fixed', top: '100px', left: '40px', zIndex: 150, 
        display: 'flex', flexDirection: 'column', gap: '12px',
        cursor: 'grab'
      }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      <AnimatePresence>
        {recordings.map((rec) => (
          <RecordingItem 
            key={rec.id} 
            rec={rec} 
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
