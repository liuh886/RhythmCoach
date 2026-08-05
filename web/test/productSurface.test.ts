import {
  APP_HASH,
  LANDING_HASH,
  hashForProductSurface,
  resolveProductSurface
} from '../src/domain/productSurface.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
}

expectEqual(resolveProductSurface(''), 'landing', 'Empty hash');
expectEqual(resolveProductSurface('#/'), 'landing', 'Homepage hash');
expectEqual(resolveProductSurface('#/features'), 'landing', 'Unknown hash');
expectEqual(resolveProductSurface('#/app'), 'app', 'App hash');
expectEqual(resolveProductSurface('#/app/'), 'app', 'App hash with trailing slash');
expectEqual(resolveProductSurface('#app'), 'app', 'Compact app hash');
expectEqual(resolveProductSurface('#/app?source=pwa'), 'app', 'PWA app hash');
expectEqual(hashForProductSurface('landing'), LANDING_HASH, 'Landing hash generation');
expectEqual(hashForProductSurface('app'), APP_HASH, 'App hash generation');

console.log('productSurface tests passed');
