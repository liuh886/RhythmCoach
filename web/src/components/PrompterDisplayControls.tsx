import { useEffect, useRef, useState } from 'react';
import { RotateCw, Type } from 'lucide-react';
import {
  fontSizeStep,
  PROMPTER_FONT_SIZE_STORAGE_KEY,
  resolvePrompterFontSize,
  type PrompterFontSize
} from '../domain/prompterDisplay';
import type { Language } from '../types';
import './PrompterDisplayControls.css';

interface OrientationController {
  type?: string;
  lock?: (orientation: 'portrait' | 'landscape') => Promise<void>;
  unlock?: () => void;
}

interface FullscreenRoot extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

function getStoredFontSize(): string | null {
  try {
    return localStorage.getItem(PROMPTER_FONT_SIZE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getInitialFontSize(): PrompterFontSize {
  return resolvePrompterFontSize(
    getStoredFontSize(),
    window.matchMedia('(max-width: 760px)').matches
  );
}

async function enterFullscreenIfAvailable(): Promise<boolean> {
  if (document.fullscreenElement) return false;
  const root = document.documentElement as FullscreenRoot;
  if (root.requestFullscreen) {
    await root.requestFullscreen();
    return true;
  }
  if (root.webkitRequestFullscreen) {
    await root.webkitRequestFullscreen();
    return true;
  }
  return false;
}

export function PrompterDisplayControls({ lang }: { lang: Language }) {
  const [fontSize, setFontSize] = useState<PrompterFontSize>(getInitialFontSize);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(() => window.matchMedia('(orientation: landscape)').matches);
  const [orientationMessage, setOrientationMessage] = useState('');
  const enteredFullscreenRef = useRef(false);
  const messageTimerRef = useRef(0);

  const text = lang === 'zh'
    ? {
        fontSize: '提词字号',
        small: '小',
        medium: '中',
        large: '大',
        decrease: '缩小字体',
        increase: '放大字体',
        landscape: '切换到横屏',
        portrait: '切换到竖屏',
        unsupported: '当前浏览器无法自动切换方向，请手动旋转手机。',
        failed: '无法自动切换方向，请检查系统旋转锁定或手动旋转手机。'
      }
    : {
        fontSize: 'Prompt size',
        small: 'Small',
        medium: 'Medium',
        large: 'Large',
        decrease: 'Decrease text size',
        increase: 'Increase text size',
        landscape: 'Switch to landscape',
        portrait: 'Switch to portrait',
        unsupported: 'This browser cannot rotate automatically. Rotate the phone manually.',
        failed: 'Could not change orientation. Check rotation lock or rotate the phone manually.'
      };

  useEffect(() => {
    document.documentElement.dataset.prompterFontSize = fontSize;
    try {
      localStorage.setItem(PROMPTER_FONT_SIZE_STORAGE_KEY, fontSize);
    } catch {
      // The current rehearsal still uses the selected size when storage is unavailable.
    }
    return () => {
      delete document.documentElement.dataset.prompterFontSize;
    };
  }, [fontSize]);

  useEffect(() => {
    const query = window.matchMedia('(orientation: landscape)');
    const updateOrientation = () => setIsLandscape(query.matches);
    updateOrientation();
    query.addEventListener?.('change', updateOrientation);
    return () => query.removeEventListener?.('change', updateOrientation);
  }, []);

  useEffect(() => () => {
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    const orientation = screen.orientation as unknown as OrientationController;
    orientation.unlock?.();
    if (enteredFullscreenRef.current && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  const showOrientationMessage = (message: string) => {
    setOrientationMessage(message);
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = window.setTimeout(() => setOrientationMessage(''), 3600);
  };

  const changeFontSize = (direction: -1 | 1) => {
    setFontSize((current) => fontSizeStep(current, direction));
  };

  const toggleOrientation = async () => {
    const orientation = screen.orientation as unknown as OrientationController;
    if (!orientation.lock) {
      showOrientationMessage(text.unsupported);
      return;
    }

    try {
      const enteredFullscreen = await enterFullscreenIfAvailable();
      if (enteredFullscreen) enteredFullscreenRef.current = true;
      await orientation.lock(isLandscape ? 'portrait' : 'landscape');
      setOrientationMessage('');
    } catch {
      showOrientationMessage(text.failed);
    }
  };

  const fontLabel = text[fontSize];
  const orientationLabel = isLandscape ? text.portrait : text.landscape;

  return (
    <div className="prompter-display-controls" aria-label={lang === 'zh' ? '提词显示设置' : 'Prompter display settings'}>
      <button
        type="button"
        className={`prompter-display-button ${fontMenuOpen ? 'active' : ''}`}
        onClick={() => setFontMenuOpen((open) => !open)}
        aria-expanded={fontMenuOpen}
        title={`${text.fontSize}: ${fontLabel}`}
      >
        <Type size={17} />
        <span>Aa</span>
      </button>

      <button
        type="button"
        className={`prompter-display-button orientation-button ${isLandscape ? 'active' : ''}`}
        onClick={() => void toggleOrientation()}
        title={orientationLabel}
        aria-label={orientationLabel}
      >
        <RotateCw size={17} />
        <span>{lang === 'zh' ? (isLandscape ? '竖屏' : '横屏') : (isLandscape ? 'Portrait' : 'Landscape')}</span>
      </button>

      {fontMenuOpen && (
        <div className="prompter-font-menu" role="group" aria-label={text.fontSize}>
          <button
            type="button"
            onClick={() => changeFontSize(-1)}
            disabled={fontSize === 'small'}
            aria-label={text.decrease}
          >
            A−
          </button>
          <div>
            <span>{text.fontSize}</span>
            <strong>{fontLabel}</strong>
          </div>
          <button
            type="button"
            onClick={() => changeFontSize(1)}
            disabled={fontSize === 'large'}
            aria-label={text.increase}
          >
            A+
          </button>
        </div>
      )}

      {orientationMessage && <div className="prompter-orientation-message" role="status">{orientationMessage}</div>}
    </div>
  );
}
