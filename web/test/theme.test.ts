import { getThemeColor, resolveTheme, toggleTheme } from '../src/domain/theme.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

expectEqual(resolveTheme('light'), 'light', 'Stored light theme');
expectEqual(resolveTheme('dark'), 'dark', 'Stored dark theme');
expectEqual(resolveTheme('system'), 'dark', 'Unknown theme falls back to dark');
expectEqual(resolveTheme(null), 'dark', 'Missing theme falls back to dark');
expectEqual(toggleTheme('dark'), 'light', 'Dark toggles to light');
expectEqual(toggleTheme('light'), 'dark', 'Light toggles to dark');
expectEqual(getThemeColor('light'), '#f4f5f8', 'Light browser theme color');
expectEqual(getThemeColor('dark'), '#08080b', 'Dark browser theme color');

console.log('theme tests passed');
