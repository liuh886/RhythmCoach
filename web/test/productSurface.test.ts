import {
  APP_HASH,
  LANDING_HASH,
  hashForPodcastSyncInvite,
  hashForProductSurface,
  normalizePodcastSyncRoomCode,
  readPodcastSyncInvite,
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
expectEqual(resolveProductSurface('#/app?sync=A3F82C'), 'app', 'Podcast invite app hash');
expectEqual(hashForProductSurface('landing'), LANDING_HASH, 'Landing hash generation');
expectEqual(hashForProductSurface('app'), APP_HASH, 'App hash generation');
expectEqual(normalizePodcastSyncRoomCode('a3f82c'), 'A3F82C', 'Room code normalization');
expectEqual(normalizePodcastSyncRoomCode('not-a-room'), null, 'Invalid room code');
expectEqual(readPodcastSyncInvite('#/app?sync=a3f82c'), 'A3F82C', 'Read podcast invite');
expectEqual(readPodcastSyncInvite('#/app?source=pwa&sync=10BEEF'), '10BEEF', 'Read podcast invite with other params');
expectEqual(readPodcastSyncInvite('#/app?sync=bad'), null, 'Reject malformed podcast invite');
expectEqual(hashForPodcastSyncInvite('a3f82c'), '#/app?sync=A3F82C', 'Podcast invite hash generation');

console.log('productSurface tests passed');
