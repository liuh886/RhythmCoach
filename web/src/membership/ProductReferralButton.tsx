import { useEffect, useState } from 'react';
import { Check, Copy, Gift, Loader2, RefreshCw, Share2, X } from 'lucide-react';
import type { Language } from '../types';
import { membershipConfig } from './config';
import { useMembership } from './MembershipProvider';
import './product-referral.css';

type ReferralResult = {
  ok: true;
  referral_url: string;
  inviter_is_pro: boolean;
  policy_days: number;
  trial_days: number;
  joined_count: number;
  trial_count: number;
};

const copy = {
  zh: {
    invite: '邀请',
    title: '邀请朋友使用 RhythmCoach',
    stable: '这是你的长期专属邀请链接。',
    pro: '你当前是 Pro；新用户通过此链接加入，可获得 {days} 天 RhythmCoach Pro 免费体验。',
    free: '链接长期有效。你成为 Pro 后，新用户领取时会自动获得当时 Admin 配置的 Pro 免费体验。',
    joined: '已加入',
    trials: 'Pro 体验',
    copy: '复制链接',
    copied: '已复制',
    share: '分享邀请',
    refresh: '刷新',
    loading: '正在生成你的专属邀请链接…',
    error: '邀请服务暂时不可用。',
    shareText: '通过我的邀请加入 RhythmCoach{benefit}。'
  },
  en: {
    invite: 'Invite',
    title: 'Invite friends to RhythmCoach',
    stable: 'This is your permanent personal referral link.',
    pro: 'You are currently Pro. New users who join through this link can activate {days} days of RhythmCoach Pro free.',
    free: 'Your link is permanent. If you become Pro, the current Admin-configured Pro benefit is applied when a new user redeems it.',
    joined: 'Joined',
    trials: 'Pro trials',
    copy: 'Copy link',
    copied: 'Copied',
    share: 'Share invite',
    refresh: 'Refresh',
    loading: 'Creating your personal referral link…',
    error: 'Referral service is temporarily unavailable.',
    shareText: 'Join RhythmCoach with my invite{benefit}.'
  }
} as const;

function track(eventName: string, extra: Record<string, unknown> = {}) {
  const analyticsWindow = window as Window & { gtag?: (...args: unknown[]) => void };
  analyticsWindow.gtag?.('event', eventName, { product_code: membershipConfig.productCode, ...extra });
}

export function ProductReferralButton({ lang }: { lang: Language }) {
  const membership = useMembership();
  const text = copy[lang];
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referral, setReferral] = useState<ReferralResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!membership.user) return null;

  const load = async (force = false) => {
    if (loading || (referral && !force)) return;
    setLoading(true);
    setError('');
    try {
      const token = await membership.getAccessToken();
      if (!token) throw new Error(text.error);
      const response = await fetch(`${membershipConfig.supabaseUrl}/functions/v1/product-referral`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: membershipConfig.supabasePublishableKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'get_or_create', product_code: membershipConfig.productCode })
      });
      const payload = await response.json().catch(() => ({})) as ReferralResult & { error?: string };
      if (!response.ok || payload.ok !== true) throw new Error(payload.error || text.error);
      setReferral(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.error);
    } finally {
      setLoading(false);
    }
  };

  const openPanel = () => {
    setOpen(true);
    track('referral_panel_open');
    void load();
  };

  const copyLink = async () => {
    if (!referral?.referral_url) return;
    await navigator.clipboard.writeText(referral.referral_url);
    setCopied(true);
    track('referral_link_copy');
  };

  const shareLink = async () => {
    if (!referral?.referral_url) return;
    const days = Number(referral.trial_days || 0);
    const benefit = days > 0
      ? (lang === 'zh' ? `，可获得 ${days} 天 Pro 免费体验` : ` and get ${days} days of Pro free`)
      : '';
    const payload = {
      title: text.title,
      text: text.shareText.replace('{benefit}', benefit),
      url: referral.referral_url
    };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(payload);
        track('referral_link_share', { method: 'native' });
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(referral.referral_url);
    setCopied(true);
    track('referral_link_share', { method: 'clipboard' });
  };

  const benefitCopy = referral && referral.trial_days > 0
    ? text.pro.replace('{days}', String(referral.trial_days))
    : text.free;

  return (
    <>
      <button
        type="button"
        className="header-icon-action rhythm-referral-trigger"
        onClick={openPanel}
        title={text.title}
        aria-label={text.title}
      >
        <Gift size={18} />
      </button>
      {open && (
        <div className="rhythm-referral-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="rhythm-referral-dialog" role="dialog" aria-modal="true" aria-labelledby="rhythm-referral-title">
            <header>
              <div><p>HAO APPS · REFERRAL</p><h2 id="rhythm-referral-title">{text.title}</h2></div>
              <button type="button" className="rhythm-referral-close" onClick={() => setOpen(false)} aria-label="Close"><X size={17} /></button>
            </header>
            {loading && <p className="rhythm-referral-status"><Loader2 size={15} className="animate-spin" /> {text.loading}</p>}
            {error && <p className="rhythm-referral-status is-error">{error}</p>}
            {referral && (
              <>
                <div className={`rhythm-referral-benefit ${referral.trial_days > 0 ? 'is-pro' : ''}`}>
                  <strong>{referral.trial_days > 0 ? `${referral.trial_days} days Pro` : text.stable}</strong>
                  <span>{benefitCopy}</span>
                </div>
                <code className="rhythm-referral-link">{referral.referral_url}</code>
                <div className="rhythm-referral-stats">
                  <div><strong>{referral.joined_count}</strong><span>{text.joined}</span></div>
                  <div><strong>{referral.trial_count}</strong><span>{text.trials}</span></div>
                </div>
                <div className="rhythm-referral-actions">
                  <button type="button" onClick={() => void copyLink()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? text.copied : text.copy}</button>
                  <button type="button" className="is-primary" onClick={() => void shareLink()}><Share2 size={15} />{text.share}</button>
                  <button type="button" onClick={() => void load(true)}><RefreshCw size={15} />{text.refresh}</button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
