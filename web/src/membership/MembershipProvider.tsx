import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { membershipConfig } from './config';

interface SupabaseErrorLike {
  message: string;
}

interface MembershipUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

interface MembershipSession {
  user: MembershipUser;
  access_token?: string;
}

interface AuthSubscription {
  unsubscribe: () => void;
}

type OAuthProvider = 'google';
type BillingReturn = 'success' | 'cancelled' | null;

interface AuthApi {
  getSession: () => Promise<{
    data: { session: MembershipSession | null };
    error: SupabaseErrorLike | null;
  }>;
  onAuthStateChange: (
    callback: (event: string, session: MembershipSession | null) => void
  ) => { data: { subscription: AuthSubscription } };
  signInWithOAuth: (input: {
    provider: OAuthProvider;
    options: { redirectTo: string };
  }) => Promise<{ error: SupabaseErrorLike | null }>;
  signInWithOtp: (input: {
    email: string;
    options: { emailRedirectTo: string; shouldCreateUser: boolean; captchaToken: string };
  }) => Promise<{ error: SupabaseErrorLike | null }>;
  signOut: () => Promise<{ error: SupabaseErrorLike | null }>;
}

interface QueryResult<T> {
  data: T | null;
  error: SupabaseErrorLike | null;
}

interface FilterBuilder<T> extends PromiseLike<QueryResult<T[]>> {
  eq: (column: string, value: string) => FilterBuilder<T>;
  select: (columns: string) => FilterBuilder<T>;
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

interface SupabaseClientLike {
  auth: AuthApi;
  from: <T>(table: string) => TableBuilder<T>;
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

interface EntitlementRow {
  entitlement_code: string;
  active: boolean;
  valid_until: string | null;
}

export interface MembershipProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  locale: string | null;
  last_seen_at: string | null;
}

interface ProductAccountRow {
  user_id: string;
  product_code: string;
  preferences: Record<string, unknown>;
  state: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at: string;
}

export interface MembershipSubscription {
  id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface MembershipContextValue {
  configured: boolean;
  billingEnabled: boolean;
  loading: boolean;
  user: MembershipUser | null;
  profile: MembershipProfile | null;
  productAccount: ProductAccountRow | null;
  subscription: MembershipSubscription | null;
  hasPaidSubscription: boolean;
  billingReturn: BillingReturn;
  error: string;
  dialogOpen: boolean;
  enforcementEnabled: boolean;
  isPro: boolean;
  hasEntitlement: (code: string) => boolean;
  openDialog: () => void;
  closeDialog: () => void;
  signInWithProvider: (provider: OAuthProvider) => Promise<void>;
  sendMagicLink: (email: string, captchaToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshEntitlements: () => Promise<void>;
  saveDisplayName: (displayName: string) => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  startCheckout: () => Promise<void>;
  openPortal: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextValue | null>(null);
const MANAGEABLE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid']);

function isEntitlementCurrent(row: EntitlementRow): boolean {
  if (!row.active) return false;
  if (!row.valid_until) return true;
  const validUntil = new Date(row.valid_until).getTime();
  return Number.isFinite(validUntil) && validUntil > Date.now();
}

function metadataText(user: MembershipUser, key: string): string | null {
  const value = user.user_metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function defaultDisplayName(user: MembershipUser): string | null {
  return metadataText(user, 'full_name')
    ?? metadataText(user, 'name')
    ?? user.email?.split('@')[0]
    ?? null;
}

function readBillingReturn(): BillingReturn {
  const url = new URL(window.location.href);
  const billing = url.searchParams.get('billing');
  if (billing !== 'success' && billing !== 'cancelled') return null;
  url.searchParams.delete('billing');
  url.searchParams.delete('session_id');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return billing;
}

async function ignoreOptional(label: string, task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.warn(`RhythmCoach optional membership ${label}:`, error);
  }
}

export function MembershipProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<SupabaseClientLike | null>(null);
  const [loading, setLoading] = useState(membershipConfig.enabled);
  const [user, setUser] = useState<MembershipUser | null>(null);
  const [profile, setProfile] = useState<MembershipProfile | null>(null);
  const [productAccount, setProductAccount] = useState<ProductAccountRow | null>(null);
  const [entitlements, setEntitlements] = useState<Set<string>>(() => new Set());
  const [subscription, setSubscription] = useState<MembershipSubscription | null>(null);
  const [billingReturn] = useState<BillingReturn>(readBillingReturn);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(Boolean(billingReturn));

  const refreshEntitlements = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !user) {
      setProfile(null);
      setProductAccount(null);
      setEntitlements(new Set());
      setSubscription(null);
      return;
    }

    const now = new Date().toISOString();
    setEntitlements(new Set());

    const refreshProfile = async () => {
      const existing = await client
        .from<MembershipProfile>('profiles')
        .select('id,display_name,avatar_url,locale,last_seen_at')
        .eq('id', user.id)
        .maybeSingle();
      if (existing.error) throw new Error(existing.error.message);

      if (!existing.data) {
        const created = await client
          .from<MembershipProfile>('profiles')
          .insert({
            id: user.id,
            display_name: defaultDisplayName(user),
            avatar_url: metadataText(user, 'avatar_url') ?? metadataText(user, 'picture'),
            locale: document.documentElement.lang.startsWith('zh') ? 'zh' : 'en',
            last_seen_at: now
          })
          .select('id,display_name,avatar_url,locale,last_seen_at')
          .single();
        if (created.error) throw new Error(created.error.message);
        setProfile(created.data);
        return;
      }

      setProfile(existing.data);
      const touched = await client
        .from<MembershipProfile>('profiles')
        .update({ last_seen_at: now })
        .eq('id', user.id)
        .select('id,display_name,avatar_url,locale,last_seen_at')
        .single();
      if (!touched.error && touched.data) setProfile(touched.data);
    };

    const refreshProductAccount = async () => {
      const result = await client
        .from<ProductAccountRow>('product_accounts')
        .upsert({
          user_id: user.id,
          product_code: membershipConfig.productCode,
          last_seen_at: now
        }, { onConflict: 'user_id,product_code' })
        .select('user_id,product_code,preferences,state,first_seen_at,last_seen_at')
        .single();
      if (result.error) throw new Error(result.error.message);
      setProductAccount(result.data);
    };

    const refreshCurrentEntitlement = async () => {
      const result = await client
        .from<EntitlementRow>('entitlements')
        .select('entitlement_code,active,valid_until')
        .eq('user_id', user.id)
        .eq('entitlement_code', membershipConfig.entitlementCode);
      if (result.error) {
        console.warn('RhythmCoach entitlement refresh failed closed:', result.error);
        return;
      }
      setEntitlements(new Set(
        (result.data ?? [])
          .filter(isEntitlementCurrent)
          .map((row) => row.entitlement_code)
      ));
    };

    const refreshSubscription = async () => {
      setSubscription(null);
      const result = await client
        .from<MembershipSubscription>('subscriptions')
        .select('id,status,current_period_end,cancel_at_period_end')
        .eq('user_id', user.id)
        .eq('product_code', membershipConfig.productCode);
      if (result.error) throw new Error(result.error.message);
      setSubscription(
        (result.data ?? []).find((row) => MANAGEABLE_SUBSCRIPTION_STATUSES.has(row.status)) ?? null
      );
    };

    await Promise.all([
      ignoreOptional('profile refresh', refreshProfile),
      ignoreOptional('product account refresh', refreshProductAccount),
      refreshCurrentEntitlement(),
      ignoreOptional('subscription refresh', refreshSubscription)
    ]);
  }, [user]);

  useEffect(() => {
    if (!membershipConfig.enabled) {
      setLoading(false);
      return;
    }

    const sdk = window.supabase;
    if (!sdk) {
      setError('Membership service failed to load. Training remains available.');
      setLoading(false);
      return;
    }

    const client = sdk.createClient(
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
    clientRef.current = client;
    let active = true;

    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setError('');
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setLoading(Boolean(user));
    void refreshEntitlements().finally(() => setLoading(false));
  }, [refreshEntitlements, user]);

  useEffect(() => {
    if (!user || billingReturn !== 'success') return;
    let active = true;
    const confirm = async () => {
      for (const delay of [700, 1400]) {
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        if (!active) return;
        await refreshEntitlements();
      }
    };
    void confirm();
    return () => { active = false; };
  }, [billingReturn, refreshEntitlements, user]);

  const signInWithProvider = useCallback(async (provider: OAuthProvider) => {
    const client = clientRef.current;
    if (!client || provider !== 'google') return;
    setError('');
    const { error: authError } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: membershipConfig.redirectUrl }
    });
    if (authError) setError(authError.message);
  }, []);

  const sendMagicLink = useCallback(async (email: string, captchaToken: string) => {
    const client = clientRef.current;
    if (!client) return;
    const verifiedToken = captchaToken.trim();
    if (!verifiedToken) throw new Error('Complete the security check first.');
    setError('');
    const { error: authError } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: membershipConfig.redirectUrl,
        shouldCreateUser: true,
        captchaToken: verifiedToken
      }
    });
    if (authError) throw new Error(authError.message);
  }, []);

  const signOut = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    const { error: authError } = await client.auth.signOut();
    if (authError) setError(authError.message);
  }, []);

  const saveDisplayName = useCallback(async (displayName: string) => {
    const client = clientRef.current;
    if (!client || !user) return;
    const normalized = displayName.trim().slice(0, 80);
    setLoading(true);
    setError('');
    try {
      const result = await client
        .from<MembershipProfile>('profiles')
        .update({
          display_name: normalized || null,
          locale: document.documentElement.lang.startsWith('zh') ? 'zh' : 'en',
          last_seen_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('id,display_name,avatar_url,locale,last_seen_at')
        .single();
      if (result.error) throw new Error(result.error.message);
      setProfile(result.data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const client = clientRef.current;
    if (!client) return null;
    const { data, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(sessionError.message);
    return data.session?.access_token ?? null;
  }, []);

  const callMembershipFunction = useCallback(async (url: string) => {
    if (!membershipConfig.billingEnabled || !url || !user) return;
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Authentication session is unavailable.');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: membershipConfig.supabasePublishableKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ product_code: membershipConfig.productCode })
      });
      const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? `Membership request failed (${response.status}).`);
      }
      window.location.assign(payload.url);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error
        ? requestError.message
        : 'Membership request failed.');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, user]);

  const startCheckout = useCallback(
    () => callMembershipFunction(membershipConfig.checkoutFunctionUrl),
    [callMembershipFunction]
  );
  const openPortal = useCallback(
    () => callMembershipFunction(membershipConfig.portalFunctionUrl),
    [callMembershipFunction]
  );

  const isPro = entitlements.has(membershipConfig.entitlementCode);
  const hasPaidSubscription = Boolean(subscription);

  const value = useMemo<MembershipContextValue>(() => ({
    configured: membershipConfig.enabled,
    billingEnabled: membershipConfig.billingEnabled,
    loading,
    user,
    profile,
    productAccount,
    subscription,
    hasPaidSubscription,
    billingReturn,
    error,
    dialogOpen,
    enforcementEnabled: membershipConfig.enforceRecordingDownload,
    isPro,
    hasEntitlement: (code: string) => code === membershipConfig.entitlementCode && entitlements.has(code),
    openDialog: () => setDialogOpen(true),
    closeDialog: () => setDialogOpen(false),
    signInWithProvider,
    sendMagicLink,
    signOut,
    refreshEntitlements,
    saveDisplayName,
    getAccessToken,
    startCheckout,
    openPortal
  }), [
    billingReturn,
    dialogOpen,
    entitlements,
    error,
    getAccessToken,
    hasPaidSubscription,
    isPro,
    loading,
    openPortal,
    productAccount,
    profile,
    refreshEntitlements,
    saveDisplayName,
    sendMagicLink,
    signInWithProvider,
    signOut,
    startCheckout,
    subscription,
    user
  ]);

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership(): MembershipContextValue {
  const value = useContext(MembershipContext);
  if (!value) throw new Error('useMembership must be used inside MembershipProvider');
  return value;
}
