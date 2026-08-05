import { strict as assert } from 'node:assert';
import {
  APP_HASH,
  LANDING_HASH,
  hashForProductSurface,
  resolveProductSurface
} from '../src/domain/productSurface';

assert.equal(resolveProductSurface(''), 'landing');
assert.equal(resolveProductSurface('#/'), 'landing');
assert.equal(resolveProductSurface('#/features'), 'landing');
assert.equal(resolveProductSurface('#/app'), 'app');
assert.equal(resolveProductSurface('#/app/'), 'app');
assert.equal(resolveProductSurface('#app'), 'app');
assert.equal(resolveProductSurface('#/app?source=pwa'), 'app');
assert.equal(hashForProductSurface('landing'), LANDING_HASH);
assert.equal(hashForProductSurface('app'), APP_HASH);

console.log('productSurface tests passed');
