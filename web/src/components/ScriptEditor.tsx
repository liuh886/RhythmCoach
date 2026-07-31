import { useState, useEffect } from 'react';
import { Mic, Play, Save, Clock, FileText, Settings2, Languages, Activity, Library, ChevronRight, X, Trash2, Upload, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { defaultMaterials, ScriptMaterial } from './materials';

interface ScriptEditorProps {
  onStart: (script: string, cpm: number, lang: 'zh' | 'en', mode: 'target' | 'free') => void;
}

export function ScriptEditor({ onStart }: ScriptEditorProps) {
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState<'zh'|'en'>('zh');
  const [prompterMode, setPrompterMode] = useState<'target'|'free'>('target');
  const [content, setContent] = useState('大家好，欢迎来到节奏教练。\n\n在这里你可以练习你的口播节奏，保持平稳的语速。尝试看着屏幕，当你不说话时，提词器会自动感应你的停顿而停止滚动。');
  const [cpm, setCpm] = useState(220);
  const [currentTip, setCurrentTip] = useState('');
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [customMaterials, setCustomMaterials] = useState<ScriptMaterial[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('rhythm_custom_materials');
    if (saved) {
      try {
        setCustomMaterials(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse custom materials');
      }
    }
  }, []);

  const wordCount = lang === 'zh' 
    ? (content.match(/[\u4e00-\u9fa5a-zA-Z0-9]/g) || []).length
    : (content.match(/\b\w+\b/g) || []).length;
    
  const estimatedSeconds = cpm > 0 ? Math.round((wordCount / cpm) * 60) : 0;
  const mins = Math.floor(estimatedSeconds / 60);
  const secs = estimatedSeconds % 60;

  const handleLangToggle = () => {
    if (lang === 'zh') {
      setLang('en');
      setCpm(150); // standard WPM
      setContent("Hello everyone, welcome to RhythmCoach.\n\nHere you can practice your pacing and maintain a steady speaking rate. Try looking at the screen; when you stop speaking, the prompter will detect your pause and stop scrolling automatically.");
      setCurrentTip('');
    } else {
      setLang('zh');
      setCpm(220);
      setContent("大家好，欢迎来到节奏教练。\n\n在这里你可以练习你的口播节奏，保持平稳的语速。尝试看着屏幕，当你不说话时，提词器会自动感应你的停顿而停止滚动。");
      setCurrentTip('');
    }
  };
  
  const handleImport = (matTitle: string, matContent: string, matTip?: string) => {
    setTitle(matTitle);
    setContent(matContent);
    setCurrentTip(matTip || '');
    setLang('zh'); // Most templates are Chinese
    setCpm(220);
    setIsDrawerOpen(false);
  };

  const handleSaveDraft = () => {
    if (!content.trim()) return;
    const finalTitle = title.trim() || `未命名草稿 ${new Date().toLocaleDateString()}`;
    const newMaterial: ScriptMaterial = {
      id: Date.now().toString(),
      title: finalTitle,
      content: content.trim()
    };
    const updated = [newMaterial, ...customMaterials];
    setCustomMaterials(updated);
    localStorage.setItem('rhythm_custom_materials', JSON.stringify(updated));
    
    // UI Feedback
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsDrawerOpen(true);
    }, 800);
  };

  const handleDeleteCustom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = customMaterials.filter(m => m.id !== id);
    setCustomMaterials(updated);
    localStorage.setItem('rhythm_custom_materials', JSON.stringify(updated));
  };

  const handleExportJSON = () => {
    if (customMaterials.length === 0) {
      alert("没有可以导出的自定义草稿 / No custom drafts to export.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customMaterials, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `rhythm_coach_materials_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          // Simple validation
          const validMaterials = imported.filter(m => m.id && m.title && m.content);
          if (validMaterials.length > 0) {
            // Merge with existing, avoiding exact id duplicates if possible
            const existingIds = new Set(customMaterials.map(m => m.id));
            const newMaterials = validMaterials.map(m => ({
              ...m,
              // generate new id if conflict
              id: existingIds.has(m.id) ? Date.now().toString() + Math.random().toString(36).substring(7) : m.id
            }));
            const updated = [...newMaterials, ...customMaterials];
            setCustomMaterials(updated);
            localStorage.setItem('rhythm_custom_materials', JSON.stringify(updated));
            alert(`成功导入 ${validMaterials.length} 个素材！`);
          } else {
            alert("文件格式不正确或没有有效素材。");
          }
        }
      } catch (err) {
        alert("解析 JSON 文件失败。");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <>
      {/* Drawer Toggle Button */}
      {!isDrawerOpen && (
        <motion.button
          initial={{ x: -50 }}
          animate={{ x: 0 }}
          className="btn-icon"
          onClick={() => setIsDrawerOpen(true)}
          style={{
            position: 'fixed', left: '20px', top: '20px', zIndex: 100,
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(20px)', width: '48px', height: '48px',
            color: 'var(--text-primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}
          title="素材库 / Library"
        >
          <Library size={24} />
        </motion.button>
      )}

      {/* Drawer Sidebar */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', zIndex: 90
              }}
            />
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass-panel"
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0, width: '360px',
                zIndex: 100, borderLeft: 'none', borderRadius: '0 24px 24px 0',
                display: 'flex', flexDirection: 'column', padding: '0',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                  <Library size={20} color="var(--accent-primary)" />
                  素材库
                </div>
                <button className="btn-icon" onClick={() => setIsDrawerOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Actions Section */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      className="btn-secondary" 
                      onClick={() => document.getElementById('import-json')?.click()}
                      style={{ flex: 1, padding: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', gap: '6px', borderRadius: '8px' }}
                    >
                      <Upload size={14} /> 导入数据
                    </button>
                    <input 
                      type="file" id="import-json" accept=".json" 
                      style={{ display: 'none' }} 
                      onChange={handleImportJSON} 
                    />
                    <button 
                      className="btn-secondary" 
                      onClick={handleExportJSON}
                      style={{ flex: 1, padding: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', gap: '6px', borderRadius: '8px' }}
                    >
                      <Download size={14} /> 导出备份
                    </button>
                  </div>

                  {/* Custom Drafts Section */}
                  {customMaterials.length > 0 && (
                    <div>
                      <h4 style={{ margin: '0 0 12px 8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>我的草稿 ({customMaterials.length})</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {customMaterials.map((mat) => (
                          <motion.div 
                            key={mat.id}
                            whileHover={{ scale: 1.02 }}
                            style={{ 
                              background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', 
                              borderRadius: '12px', padding: '16px', cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', gap: '8px'
                            }}
                            onClick={() => handleImport(mat.title, mat.content, mat.tip)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                {mat.title}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button 
                                  className="btn-icon" 
                                  onClick={(e) => handleDeleteCustom(e, mat.id)}
                                  style={{ width: '24px', height: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                                <ChevronRight size={16} color="var(--accent-primary)" />
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {mat.content}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Default Materials Section */}
                  <div>
                    <h4 style={{ margin: '0 0 12px 8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>精选练习素材 ({defaultMaterials.length})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {defaultMaterials.map((mat, index) => (
                        <motion.div 
                          key={mat.id}
                          whileHover={{ scale: 1.02 }}
                          style={{ 
                            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', 
                            borderRadius: '12px', padding: '16px', cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', gap: '8px'
                          }}
                          onClick={() => handleImport(mat.title, mat.content, mat.tip)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              {index + 1}. {mat.title}
                            </span>
                            <ChevronRight size={16} color="var(--text-secondary)" />
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {mat.content}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-panel" 
        style={{ padding: '32px', maxWidth: '800px', margin: '60px auto', width: '92%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.2), rgba(56, 189, 248, 0.2))', 
              padding: '14px', borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(167, 139, 250, 0.15)'
            }}>
              <Mic size={32} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 style={{ 
                fontSize: '2.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, #fff, #a78bfa)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))'
              }}>RhythmCoach</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.95rem', fontWeight: 500 }}>
                {lang === 'zh' ? '你的智能口播排练助手' : 'Your Smart Teleprompter'}
              </p>
            </div>
          </div>
          <button onClick={handleLangToggle} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}>
            <Languages size={18} /> {lang === 'zh' ? '切换到英文 (WPM)' : 'Switch to Chinese'}
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              <FileText size={16} /> {lang === 'zh' ? '稿件标题' : 'Script Title'}
            </label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder={lang === 'zh' ? "例如：产品发布会开场演讲..." : "e.g. Product Launch Keynote..."}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {lang === 'zh' ? '稿件正文' : 'Script Content'}
            </label>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{ minHeight: '260px', resize: 'vertical' }}
              placeholder={lang === 'zh' ? "输入或粘贴你的口播稿件..." : "Type or paste your script..."}
            />
            {currentTip && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                  marginTop: '12px', padding: '12px 16px', 
                  background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', 
                  borderRadius: '12px', color: '#38bdf8', fontSize: '0.9rem',
                  display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.5
                }}
              >
                <div style={{ marginTop: '2px' }}>💡</div>
                <div>{currentTip}</div>
              </motion.div>
            )}
          </div>

          <div style={{ 
            display: 'flex', justifyContent: 'space-between', 
            background: 'rgba(0,0,0,0.2)', padding: '16px 20px', borderRadius: '12px',
            border: '1px solid var(--glass-border)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{lang === 'zh' ? '有效字数' : 'Word Count'}</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{wordCount} <span style={{fontSize: '1rem', fontWeight: 400, color: 'var(--text-secondary)'}}>{lang === 'zh' ? '字' : 'words'}</span></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{lang === 'zh' ? '预估时长' : 'Estimated Time'}</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="var(--text-secondary)"/>
                {prompterMode === 'target' 
                  ? (mins > 0 ? (lang === 'zh' ? `${mins}分 ` : `${mins}m `) : '') + `${secs}` + (lang === 'zh' ? '秒' : 's')
                  : (lang === 'zh' ? '-- 分 -- 秒' : '-- m -- s')
                }
              </span>
            </div>
          </div>

          {/* Mode Selector */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              <Activity size={16} /> {lang === 'zh' ? '提词模式' : 'Prompter Mode'}
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className={`btn ${prompterMode === 'target' ? '' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '12px' }}
                onClick={() => setPrompterMode('target')}
              >
                {lang === 'zh' ? '定速训练 (自动滚动)' : 'Target Pace (Auto-scroll)'}
              </button>
              <button 
                className={`btn ${prompterMode === 'free' ? '' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '12px' }}
                onClick={() => setPrompterMode('free')}
              >
                {lang === 'zh' ? '自由演讲 (手动控制)' : 'Free Pace (Manual)'}
              </button>
            </div>
          </div>

          {prompterMode === 'target' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  <Settings2 size={16} /> {lang === 'zh' ? '目标语速' : 'Target Speed'}
                </label>
                <span style={{ background: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {cpm} {lang === 'zh' ? '字 / 分钟 (CPM)' : 'Words / Min (WPM)'}
                </span>
              </div>
              <input 
                type="range" 
                min="80" max="350" 
                value={cpm} 
                onChange={e => setCpm(parseInt(e.target.value))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <span>{lang === 'zh' ? '舒缓 (120)' : 'Slow (100)'}</span>
                <span>{lang === 'zh' ? '适中 (220)' : 'Normal (150)'}</span>
                <span>{lang === 'zh' ? '急促 (350)' : 'Fast (250)'}</span>
              </div>
            </motion.div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '20px' }}>
            <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={!content.trim() || isSaving}>
              <Save size={18} /> {isSaving ? (lang === 'zh' ? '已保存!' : 'Saved!') : (lang === 'zh' ? '保存草稿' : 'Save Draft')}
            </button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn" 
              onClick={() => onStart(content, cpm, lang, prompterMode)}
            >
              <Play size={18} fill="currentColor" /> {lang === 'zh' ? '进入提词模式' : 'Start Prompter'}
            </motion.button>
          </div>
        </div>
      </motion.div>

    </>
  );
}
