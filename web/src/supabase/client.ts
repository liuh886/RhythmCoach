import { membershipConfig } from '../membership/config';

export interface SupabaseErrorLike {
  message: string;
}

export interface SupabaseUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

export interface SupabaseSession {
  user: SupabaseUser;
  access_token?: string;
}

interface AuthSubscription {
  unsubscribe: () => void;
}

interface AuthApi {
  getSession: () => Promise<{
    data: { session: SupabaseSession | null };
    error: SupabaseErrorLike | null;
  }>;
  onAuthStateChange: (
    callback: (event: string, session: SupabaseSession | null) => void
  ) => { data: { subscription: AuthSubscription } };
  signInWithOAuth: (input: {
    provider: 'google' | 'github';
    options: { redirectTo: string };
  }) => Promise<{ error: SupabaseErrorLike | null }>;
  signInWithOtp: (input: {
    email: string;
    options: { emailRedirectTo: string; shouldCreateUser: boolean; captchaToken: string };
  }) => Promise<{ error: SupabaseErrorLike | null }>;
  signOut: () => Promise<{ error: SupabaseErrorLike | null }>;
}

export interface QueryResult<T> {
  data: T | null;
  error: SupabaseErrorLike | null;
}

export interface FilterBuilder<T> extends PromiseLike<QueryResult<T[]>> {
  eq: (column: string, value: string | boolean) => FilterBuilder<T>;
  select: (columns: string) => FilterBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => FilterBuilder<T>;
  maybeSingle: () => Promise<QueryResult<T>>;
  single: () => Promise<QueryResult<T>>;
}

interface TableBuilder<T> {
  select: (columns: string) => FilterBuilder<T>;
  insert: (values: Record<string, unknown>) => FilterBuilder<T>;
  update: (values: Record<string, unknown>) => FilterBuilder<T>;
  upsert: (
    values: Record<string, unknown>,
    options?: { onConflict?: string }
  ) => FilterBuilder<T>;
}

export interface RealtimeChannelLike {
  on: (
    type: 'broadcast' | 'presence',
    filter: Record<string, string>,
    callback: (payload: any) => void
  ) => RealtimeChannelLike;
  subscribe: (callback?: (status: string, error?: unknown) => void) => RealtimeChannelLike;
  send: (message: {
    type: 'broadcast';
    event: string;
    payload: Record<string, unknown>;
  }) => Promise<string>;
  track: (payload: Record<string, unknown>) => Promise<string>;
  presenceState: () => Record<string, Array<Record<string, unknown>>>;
}

export interface SupabaseClientLike {
  auth: AuthApi;
  from: <T>(table: string) => TableBuilder<T>;
  rpc: <T>(fn: string, params?: Record<string, unknown>) => Promise<QueryResult<T>>;
  channel: (
    topic: string,
    options?: {
      config?: {
        private?: boolean;
        presence?: { key?: string };
      };
    }
  ) => RealtimeChannelLike;
  removeChannel: (channel: RealtimeChannelLike) => Promise<string>;
}

interface SupabaseBrowserSdk {
  createClient: (
    url: string,
    key: string,
    options: {
      auth: {
        persistSession: boolean;
        autoRefreshToken: boolean;
        detectSessionInUrl: boolean;
        flowType: 'pkce';
      };
    }
  ) => SupabaseClientLike;
}

declare global {
  interface Window {
    supabase?: SupabaseBrowserSdk;
  }
}

let sharedClient: SupabaseClientLike | null = null;

export function getSupabaseClient(): SupabaseClientLike | null {
  if (sharedClient) return sharedClient;
  const sdk = window.supabase;
  if (!sdk) return null;

  sharedClient = sdk.createClient(
    membershipConfig.supabaseUrl,
    membershipConfig.supabasePublishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  );
  return sharedClient;
}
