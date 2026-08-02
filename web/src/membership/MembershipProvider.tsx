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
}

interface AuthSubscription {
  unsubscribe: () => void;
}

interface AuthApi {
  getSession: () => Promise<{
    data: { session: MembershipSession | null };
    error: SupabaseErrorLike | null;
  }>;
  onAuthStateChange: (
    callback: (event: string, session: MembershipSession | null) => void
  ) => { data: { subscription: AuthSubscription } };
  signInWithOAuth: (input: {
    provider: 'google';
    options: { redirectTo: string };
  }) => Promise<{ error: SupabaseErrorLike | null }>;
  signInWithOtp: (input: {
    email: string;
    options: { emailRedirectTo: string; shouldCreateUser: boolean };
  }) => Promise<{ error: SupabaseErrorLike | null }>;
  signOut: () => Promise<{ error: SupabaseErrorLike | null }>;
}

interface EntitlementRow {
  entitlement_code: string;
  active: boolean;
  valid_until: string | null;
}

interface EntitlementQuery {
  eq: (
    column: string,
    value: string
  ) => Promise<{ data: EntitlementRow[] | null; error: SupabaseErrorLike | null }>;
}

interface SupabaseClientLike {
  auth: AuthApi;
  from: (table: 'entitlements') => {
    select: (columns: string) => EntitlementQuery;
  };
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

interface MembershipContextValue {
  configured: boolean;
  loading: boolean;
  user: MembershipUser | null;
  error: string;
  dialogOpen: boolean;
  enforcementEnabled: boolean;
  hasEntitlement: (code: string) => boolean;
  openDialog: () => void;
  closeDialog: () => void;
  signInWithGoogle: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshEntitlements: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextValue | null>(null);

function isEntitlementCurrent(row: EntitlementRow): boolean {
  if (!row.active) return false;
  if (!row.valid_until) return true;
  const validUntil = new Date(row.valid_until).getTime();
  return Number.isFinite(validUntil) && validUntil > Date.now();
}

export function MembershipProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<SupabaseClientLike | null>(null);
  const [loading, setLoading] = useState(membershipConfig.enabled);
  const [user, setUser] = useState<MembershipUser | null>(null);
  const [entitlements, setEntitlements] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const refreshEntitlements = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !user) {
      setEntitlements(new Set());
      return;
    }

    const { data, error: queryError } = await client
      .from('entitlements')
      .select('entitlement_code,active,valid_until')
      .eq('user_id', user.id);

    if (queryError) throw new Error(queryError.message);
    setEntitlements(new Set(
      (data ?? [])
        .filter(isEntitlementCurrent)
        .map((row) => row.entitlement_code)
    ));
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
    void refreshEntitlements().catch((refreshError: unknown) => {
      const message = refreshError instanceof Error
        ? refreshError.message
        : 'Membership access could not be refreshed.';
      setError(message);
    });
  }, [refreshEntitlements]);

  const signInWithGoogle = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    setError('');
    const { error: authError } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: membershipConfig.redirectUrl }
    });
    if (authError) setError(authError.message);
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const client = clientRef.current;
    if (!client) return;
    setError('');
    const { error: authError } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: membershipConfig.redirectUrl,
        shouldCreateUser: true
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

  const value = useMemo<MembershipContextValue>(() => ({
    configured: membershipConfig.enabled,
    loading,
    user,
    error,
    dialogOpen,
    enforcementEnabled: membershipConfig.enforceRecordingDownload,
    hasEntitlement: (code: string) => entitlements.has(code),
    openDialog: () => setDialogOpen(true),
    closeDialog: () => setDialogOpen(false),
    signInWithGoogle,
    sendMagicLink,
    signOut,
    refreshEntitlements
  }), [
    dialogOpen,
    entitlements,
    error,
    loading,
    refreshEntitlements,
    sendMagicLink,
    signInWithGoogle,
    signOut,
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
