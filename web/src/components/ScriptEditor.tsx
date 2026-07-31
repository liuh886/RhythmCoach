import { useState } from 'react';
import { Mic, Play, Save, Clock, FileText, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScriptEditorProps {
  onStart: (script: string, cpm: number) => void;
}

export function ScriptEditor({ onStart }: ScriptEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('大家好，欢迎来到节奏教练。\n\n在这里你可以练习你的口播节奏，保持平稳的语速。尝试看着屏幕，当你不说话时，提词器会自动感应你的停顿而停止滚动。');
  const [cpm, setCpm] = useState(220);

  const charCount = (content.match(/[\u4e00-\u9fa5a-zA-Z0-9]/g) || []).length;
  const estimatedSeconds = cpm > 0 ? Math.round((charCount / cpm) * 60) : 0;
  const mins = Math.floor(estimatedSeconds / 60);
  const secs = estimatedSeconds % 60;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="glass-panel" 
      style={{ padding: '32px', maxWidth: '800px', margin: '60px auto', width: '92%' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{ 
          background: 'var(--accent-glow)', padding: '12px', borderRadius: '16px',
          boxShadow: '0 0 20px var(--accent-glow)'
        }}>
          <Mic size={28} color="var(--text-primary)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>节奏教练</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>你的智能口播排练助手</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            <FileText size={16} /> 稿件标题
          </label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="例如：产品发布会开场演讲..."
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            稿件正文
          </label>
          <textarea 
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ minHeight: '260px', resize: 'vertical' }}
            placeholder="输入或粘贴你的口播稿件..."
          />
        </div>

        <div style={{ 
          display: 'flex', justifyContent: 'space-between', 
          background: 'rgba(0,0,0,0.2)', padding: '16px 20px', borderRadius: '12px',
          border: '1px solid var(--glass-border)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>有效字数</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{charCount} <span style={{fontSize: '1rem', fontWeight: 400, color: 'var(--text-secondary)'}}>字</span></span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>预估时长</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="var(--text-secondary)"/>
              {mins > 0 ? `${mins}分 ` : ''}{secs}秒
            </span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              <Settings2 size={16} /> 目标语速
            </label>
            <span style={{ background: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
              {cpm} 字 / 分钟
            </span>
          </div>
          <input 
            type="range" 
            min="100" max="350" 
            value={cpm} 
            onChange={e => setCpm(parseInt(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>舒缓 (100)</span>
            <span>适中 (220)</span>
            <span>急促 (350)</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '20px' }}>
          <button className="btn btn-secondary">
            <Save size={18} /> 保存草稿
          </button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn" 
            onClick={() => onStart(content, cpm)}
          >
            <Play size={18} fill="currentColor" /> 进入提词模式
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
