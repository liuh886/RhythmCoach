import { useState } from 'react';
import { Mic, Play, Save } from 'lucide-react';

interface ScriptEditorProps {
  onStart: (script: string, cpm: number) => void;
}

export function ScriptEditor({ onStart }: ScriptEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('大家好，欢迎来到节奏教练。\n在这里你可以练习你的口播节奏，保持平稳的语速。');
  const [cpm, setCpm] = useState(220);

  const charCount = (content.match(/[\u4e00-\u9fa5a-zA-Z0-9]/g) || []).length;
  const estimatedSeconds = cpm > 0 ? Math.round((charCount / cpm) * 60) : 0;
  const mins = Math.floor(estimatedSeconds / 60);
  const secs = estimatedSeconds % 60;

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '800px', margin: '40px auto', width: '90%' }}>
      <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Mic size={24} color="var(--accent-primary)" />
        节奏教练 - 稿件准备
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>标题</label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="输入稿件标题..."
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>稿件内容</label>
          <textarea 
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ minHeight: '200px', resize: 'vertical' }}
            placeholder="输入或粘贴你的口播稿件..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <span>字数: {charCount}</span>
          <span>估算时长: {mins}分{secs}秒</span>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            目标节奏 (CPM: 字/分钟): {cpm}
          </label>
          <input 
            type="range" 
            min="100" max="350" 
            value={cpm} 
            onChange={e => setCpm(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={18} /> 保存草稿
          </button>
          <button className="btn" onClick={() => onStart(content, cpm)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Play size={18} /> 开始口播
          </button>
        </div>
      </div>
    </div>
  );
}
