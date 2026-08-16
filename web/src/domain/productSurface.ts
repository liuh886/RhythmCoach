export type ProductSurface = 'landing' | 'app';

export const LANDING_HASH = '#/';
export const APP_HASH = '#/app';

const PODCAST_SYNC_PARAM = 'sync';
const ROOM_CODE_PATTERN = /^[A-F0-9]{6}$/;

export function resolveProductSurface(hash: string | null | undefined): ProductSurface {
  const route = String(hash || '')
    .trim()
    .replace(/^#/, '')
    .split('?')[0]
    .replace(/\/+$/, '')
    .toLowerCase();

  return route === '/app' || route === 'app' ? 'app' : 'landing';
}

export function hashForProductSurface(surface: ProductSurface): string {
  return surface === 'app' ? APP_HASH : LANDING_HASH;
}

export function normalizePodcastSyncRoomCode(value: string | null | undefined): string | null {
  const normalized = String(value || '').trim().toUpperCase();
  return ROOM_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function readPodcastSyncInvite(hash: string | null | undefined): string | null {
  const raw = String(hash || '').trim().replace(/^#/, '');
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
  if (!query) return null;
  return normalizePodcastSyncRoomCode(new URLSearchParams(query).get(PODCAST_SYNC_PARAM));
}

export function hashForPodcastSyncInvite(roomCode: string): string {
  const normalized = normalizePodcastSyncRoomCode(roomCode);
  if (!normalized) throw new Error('Invalid podcast sync room code');
  return `${APP_HASH}?${PODCAST_SYNC_PARAM}=${encodeURIComponent(normalized)}`;
}
