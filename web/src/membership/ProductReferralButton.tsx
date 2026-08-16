import { useEffect } from 'react';
import { Gift } from 'lucide-react';
import type { Language } from '../types';
import { membershipConfig } from './config';
import { useMembership } from './MembershipProvider';

const SHARED_ROOT = 'https://liuh886.github.io/admin/shared';
const REFERRAL_STYLE_ID = 'hao-product-referral-styles';
const REFERRAL_SCRIPT_ID = 'hao-product-referral-script';

interface ReferralApi {
  open?: () => void;
}

interface ReferralFunctionResult {
  data: unknown;
  error: { message: string } | null;
}

interface ReferralClient {
  functions: {
    invoke: (name: string, input: { body: Record<string, unknown> }) => Promise<ReferralFunctionResult>;
  };
}

interface HaoAccountBridge {
  open: () => void;
  getClient: () => Promise<ReferralClient>;
  subscribe: (listener: (snapshot: { user: unknown; isPro: boolean }) => void) => () => void;
}

declare global {
  interface Window {
    HaoAccountConfig?: Readonly<Record<string, unknown>>;
    HaoAccount?: HaoAccountBridge;
    HaoReferral?: ReferralApi;
  }
}

let sharedAssetsPromise: Promise<void> | null = null;

function ensureSharedAssets(): Promise<void> {
  if (window.HaoReferral?.open) return Promise.resolve();
  if (sharedAssetsPromise) return sharedAssetsPromise;

  if (!document.getElementById(REFERRAL_STYLE_ID)) {
    const stylesheet = document.createElement('link');
    stylesheet.id = REFERRAL_STYLE_ID;
    stylesheet.rel = 'stylesheet';
    stylesheet.href = `${SHARED_ROOT}/product-referral.css?v=3`;
    document.head.appendChild(stylesheet);
  }

  sharedAssetsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(REFERRAL_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    const finish = () => window.HaoReferral?.open
      ? resolve()
      : reject(new Error('Shared referral surface did not initialize.'));

    if (existing) {
      if (window.HaoReferral?.open) resolve();
      else {
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', () => reject(new Error('Shared referral surface failed to load.')), { once: true });
      }
      return;
    }

    script.id = REFERRAL_SCRIPT_ID;
    script.src = `${SHARED_ROOT}/product-referral.js?v=3`;
    script.async = true;
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('Shared referral surface failed to load.')), { once: true });
    document.head.appendChild(script);
  });

  return sharedAssetsPromise;
}

interface ProductReferralButtonProps {
  lang: Language;
  variant?: 'icon' | 'menu';
  onOpen?: () => void;
}

export function ProductReferralButton({ lang, variant = 'icon', onOpen }: ProductReferralButtonProps) {
  const membership = useMembership();
  const label = lang === 'zh' ? '邀请朋友' : 'Invite a friend';

  window.HaoAccountConfig = Object.freeze({
    enabled: true,
    referralEnabled: true,
    standaloneReferralTrigger: false,
    appName: 'RhythmCoach',
    productCode: membershipConfig.productCode,
  });

  window.HaoAccount = {
    open: membership.openDialog,
    getClient: async () => ({
      functions: {
        invoke: async (name, input) => {
          if (name !== 'product-referral') return { data: null, error: { message: 'Unknown shared function.' } };
          const token = await membership.getAccessToken();
          if (!token) return { data: null, error: { message: 'Sign in to continue.' } };
          const response = await fetch(`${membershipConfig.supabaseUrl}/functions/v1/product-referral`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: membershipConfig.supabasePublishableKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(input.body),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) return { data: null, error: { message: payload.error || 'Referral service is unavailable.' } };
          return { data: payload, error: null };
        },
      },
    }),
    subscribe: (listener) => {
      listener({ user: membership.user, isPro: membership.isPro });
      return () => {};
    },
  };

  useEffect(() => {
    void ensureSharedAssets();
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('hao:account-changed', {
      detail: { user: membership.user, isPro: membership.isPro },
    }));
  }, [membership.isPro, membership.user]);

  const openReferral = async () => {
    await ensureSharedAssets();
    if (!window.HaoReferral?.open) throw new Error('Shared referral surface is unavailable.');
    onOpen?.();
    window.HaoReferral.open();
  };

  if (variant === 'menu') {
    return (
      <button
        type="button"
        className="header-menu-action"
        role="menuitem"
        onClick={() => void openReferral()}
      >
        <Gift size={17} />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="header-icon-action"
      onClick={() => void openReferral()}
      title={label}
      aria-label={label}
    >
      <Gift size={18} />
    </button>
  );
}
