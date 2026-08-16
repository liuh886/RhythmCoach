import { getSupabaseClient, type SupabaseUser } from '../supabase/client';
import type { Language } from '../types';

function randomGuestSuffix(): string {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function guestDisplayName(lang: Language): string {
  return `${lang === 'zh' ? '访客' : 'Guest'} ${randomGuestSuffix()}`;
}

export async function ensurePodcastSyncIdentity(lang: Language): Promise<SupabaseUser> {
  const client = getSupabaseClient();
  if (!client) throw new Error('sync_unavailable');

  const current = await client.auth.getSession();
  if (current.error) throw new Error(current.error.message);
  if (current.data.session?.user) return current.data.session.user;

  const anonymous = await client.auth.signInAnonymously({
    options: {
      data: {
        full_name: guestDisplayName(lang),
        rhythmcoach_guest: true
      }
    }
  });
  if (anonymous.error) throw new Error(anonymous.error.message);

  const user = anonymous.data.session?.user ?? anonymous.data.user;
  if (!user) throw new Error('anonymous_session_unavailable');
  return user;
}

export function roomIdentityDisplayName(user: SupabaseUser, lang: Language): string {
  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim();
  const name = user.user_metadata?.name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  if (user.email) return user.email.split('@')[0] || (lang === 'zh' ? '成员' : 'Member');
  return lang === 'zh' ? '访客' : 'Guest';
}
