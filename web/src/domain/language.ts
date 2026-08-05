import type { Language } from '../types';

export const LANGUAGE_STORAGE_KEY = 'rhythmcoach_language_v1';

export function normalizeSupportedLanguage(locale: string | null | undefined): Language | null {
  if (!locale) return null;
  const normalized = locale.trim().toLowerCase().replace('_', '-');
  if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  return null;
}

export function detectPreferredLanguage(languages?: readonly string[]): Language {
  const browserLanguages = typeof navigator !== 'undefined'
    ? (navigator.languages.length > 0 ? navigator.languages : [navigator.language])
    : [];
  const candidates = languages ?? browserLanguages;
  for (const candidate of candidates) {
    const supported = normalizeSupportedLanguage(candidate);
    if (supported) return supported;
  }
  return 'en';
}

export function readStoredLanguage(): Language | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return normalizeSupportedLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function persistLanguage(language: Language): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Language still applies for this session when storage is unavailable.
  }
}

export function resolveInitialLanguage(languages?: readonly string[]): Language {
  return readStoredLanguage() ?? detectPreferredLanguage(languages);
}

export function toHtmlLanguage(language: Language): 'zh-CN' | 'en' {
  return language === 'zh' ? 'zh-CN' : 'en';
}
