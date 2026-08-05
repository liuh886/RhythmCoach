import {
  detectPreferredLanguage,
  normalizeSupportedLanguage,
  resolveInitialLanguage,
  toHtmlLanguage
} from '../src/domain/language.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
}

expectEqual(normalizeSupportedLanguage('zh-CN'), 'zh', 'Simplified Chinese locale');
expectEqual(normalizeSupportedLanguage('zh_HK'), 'zh', 'Chinese locale with underscore');
expectEqual(normalizeSupportedLanguage('en-US'), 'en', 'English locale');
expectEqual(normalizeSupportedLanguage('fr-FR'), null, 'Unsupported locale');
expectEqual(detectPreferredLanguage(['fr-FR', 'en-GB', 'zh-CN']), 'en', 'First supported browser language wins');
expectEqual(detectPreferredLanguage(['zh-TW', 'en-US']), 'zh', 'Chinese browser language');
expectEqual(detectPreferredLanguage(['de-DE']), 'en', 'Unsupported languages fall back to English');
expectEqual(resolveInitialLanguage(['en-US']), 'en', 'Initial English language');
expectEqual(toHtmlLanguage('zh'), 'zh-CN', 'Chinese HTML language');
expectEqual(toHtmlLanguage('en'), 'en', 'English HTML language');

console.log('language tests passed');
