export type AppTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'rhythmcoach_theme_v1';

export function resolveTheme(value: string | null | undefined): AppTheme {
  return value === 'light' ? 'light' : 'dark';
}

export function toggleTheme(theme: AppTheme): AppTheme {
  return theme === 'dark' ? 'light' : 'dark';
}

export function getThemeColor(theme: AppTheme): string {
  return theme === 'light' ? '#f4f5f8' : '#08080b';
}
