export type PrompterFontSize = 'small' | 'medium' | 'large';

export const PROMPTER_FONT_SIZE_STORAGE_KEY = 'rhythmcoach_prompter_font_size_v1';

const FONT_SIZES: readonly PrompterFontSize[] = ['small', 'medium', 'large'];

export function isPrompterFontSize(value: unknown): value is PrompterFontSize {
  return typeof value === 'string' && FONT_SIZES.includes(value as PrompterFontSize);
}

export function resolvePrompterFontSize(
  storedValue: unknown,
  mobileViewport: boolean
): PrompterFontSize {
  if (isPrompterFontSize(storedValue)) return storedValue;
  return mobileViewport ? 'small' : 'medium';
}

export function fontSizeStep(
  current: PrompterFontSize,
  direction: -1 | 1
): PrompterFontSize {
  const index = FONT_SIZES.indexOf(current);
  const nextIndex = Math.min(FONT_SIZES.length - 1, Math.max(0, index + direction));
  return FONT_SIZES[nextIndex];
}
