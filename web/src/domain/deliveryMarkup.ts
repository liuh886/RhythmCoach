export type DeliveryCueKind = 'short-pause' | 'long-pause' | 'breath';
export type ArticulationCueKind = 'flat' | 'retroflex';

export type DeliveryToken =
  | { kind: 'text'; text: string; emphasis: boolean; articulation?: ArticulationCueKind }
  | { kind: 'cue'; cue: DeliveryCueKind };

const MARKUP_PATTERN = /(\[\[[\s\S]*?\]\]|\{\{(?:flat|retro):[\s\S]*?\}\}|\{\/\/\}|\{\/\}|\{b\})/g;

export function parseDeliveryMarkup(markup: string): DeliveryToken[] {
  if (!markup) return [];

  return markup
    .split(MARKUP_PATTERN)
    .filter(Boolean)
    .map((part): DeliveryToken => {
      if (part === '{/}') return { kind: 'cue', cue: 'short-pause' };
      if (part === '{//}') return { kind: 'cue', cue: 'long-pause' };
      if (part === '{b}') return { kind: 'cue', cue: 'breath' };

      const articulationMatch = part.match(/^\{\{(flat|retro):([\s\S]*?)\}\}$/);
      if (articulationMatch) {
        return {
          kind: 'text',
          text: articulationMatch[2],
          emphasis: false,
          articulation: articulationMatch[1] === 'flat' ? 'flat' : 'retroflex'
        };
      }

      if (part.startsWith('[[') && part.endsWith(']]')) {
        return { kind: 'text', text: part.slice(2, -2), emphasis: true };
      }
      return { kind: 'text', text: part, emphasis: false };
    });
}

export function stripDeliveryMarkup(markup: string): string {
  return parseDeliveryMarkup(markup)
    .filter((token): token is Extract<DeliveryToken, { kind: 'text' }> => token.kind === 'text')
    .map((token) => token.text)
    .join('');
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

export function isDeliveryMarkupAligned(markup: string | undefined, script: string): boolean {
  return Boolean(markup) && normalizeText(stripDeliveryMarkup(markup || '')) === normalizeText(script);
}
