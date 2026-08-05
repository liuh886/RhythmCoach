export type ProductSurface = 'landing' | 'app';

export const LANDING_HASH = '#/';
export const APP_HASH = '#/app';

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
