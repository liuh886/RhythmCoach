import {
  fontSizeStep,
  isPrompterFontSize,
  resolvePrompterFontSize
} from '../src/domain/prompterDisplay.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

expectEqual(resolvePrompterFontSize(null, true), 'small', 'Mobile default');
expectEqual(resolvePrompterFontSize(null, false), 'medium', 'Desktop default');
expectEqual(resolvePrompterFontSize('large', true), 'large', 'Stored preference wins');
expectEqual(resolvePrompterFontSize('invalid', true), 'small', 'Invalid mobile preference');
expectEqual(isPrompterFontSize('medium'), true, 'Valid font size');
expectEqual(isPrompterFontSize('xlarge'), false, 'Invalid font size');
expectEqual(fontSizeStep('small', -1), 'small', 'Lower bound');
expectEqual(fontSizeStep('small', 1), 'medium', 'Increase font size');
expectEqual(fontSizeStep('large', 1), 'large', 'Upper bound');
expectEqual(fontSizeStep('large', -1), 'medium', 'Decrease font size');

console.log('prompterDisplay tests passed');
