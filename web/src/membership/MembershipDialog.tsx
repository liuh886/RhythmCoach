import { useEffect, useState } from 'react';
import {
  Cloud,
  CreditCard,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  Sparkles,
  UserCircle,
  X
} from 'lucide-react';
import type { Language } from '../types';
import { membershipConfig } from './config';
import { useMembership } from './MembershipProvider';
import { TurnstileWidget } from './TurnstileWidget';
import './membership.css';

const copy = {
  zh: {
    account: '账户',
    title: 'RhythmCoach 账户',
    intro: '核心排练保持免费。登录用于同步身份、保存个人素材并管理 RhythmCoach Pro。',
    privacy: '录音永远只保存在本机浏览器，绝不会上传或在线保存；只有你主动保存到“个人素材库”的文字素材会同步到云端。',
    google: '使用 Google 登录',
    or: '或',
    email: '邮箱地址',
    magic: '发送登录链接',
    sent: '登录链接已发送，请检查邮箱。',
    captchaUnavailable: '人机验证暂时不可用，请稍后重试。',
    signOut: '退出登录',
    refresh: '刷新权益',
    signedIn: '已登录',
    loading: '正在加载…',
    free: 'Free',
    pro: 'RhythmCoach Pro',
    manage: '管理订阅',
    close: '关闭',
    displayName: '显示名称',
    saveName: '保存名称',
    saved: '名称已保存。',
    benefits: 'Free 与 RhythmCoach Pro',
    featureDownload: 'Pro · 下载本地录音文件',
    featureMaterials: 'Pro · 在线保存并跨设备同步个人素材库',
    featureTraining: 'Free · 核心排练、录音与节奏反馈',
    localFirst: '数据边界',
    proKicker: 'PRO · 可选支持',
    proTitle: '开通 RhythmCoach Pro',
    proBody: 'US$1/月解锁录音下载与跨设备个人素材库，并支持 RhythmCoach 持续维护。核心排练继续免费。',
    proPrice: 'US$1 / 月',
    becomePro: '开通 RhythmCoach Pro',
    guestSteps: '1 登录账户 · 2 Stripe 付款 · 3 Pro 自动生效',
    guestHint: '使用 Google 或邮箱登录后继续开通',
    stripeNote: '通过 Stripe 安全结账 · 可随时取消',
    proAccess: 'Pro 权限已激活',
    grantedBody: '此账户已拥有 RhythmCoach Pro 权限，且当前没有需要续费或取消的付费订阅。',
    paidActive: 'Pro 订阅有效',
    renewsBody: '当前 Pro 权限来自有效订阅。下次续费日期为 {date}；付款方式、取消与账单信息由 Stripe 安全管理。',
    trialActive: 'Pro · 免费体验中',
    trialBody: '免费体验有效至 {date}。这是一条可管理的 Stripe 订阅，你可以随时查看订阅、管理付款方式或取消。',
    cancellationScheduled: '已安排取消',
    cancellationBody: '订阅已安排取消，不会继续续费。RhythmCoach Pro 将保持有效至 {date}。',
    paymentAttention: '付款状态需要处理',
    paymentAttentionBody: 'Stripe 当前将此订阅标记为付款待处理。Pro 状态按服务端权益结果执行；请进入订阅管理检查付款方式。',
    billingSuccess: '付款已完成，Pro 权限已更新。',
    billingPending: '付款已完成，正在确认 Pro 权限。若刚刚完成结账，权益通常会很快同步。',
    billingCancelled: '未完成付款。核心排练与 Free 使用不受影响。',
    billingUnavailable: '暂时无法打开 Stripe 付款或订阅管理页面。你的账户和现有权限不受影响。'
  },
  en: {
    account: 'Account',
    title: 'RhythmCoach account',
    intro: 'Core rehearsal stays free. Sign in to keep one identity, sync your personal library, and manage RhythmCoach Pro.',
    privacy: 'Recordings always stay in this browser and are never uploaded or stored online. Only text you explicitly save to your personal library is synced to the cloud.',
    google: 'Continue with Google',
    or: 'OR',
    email: 'Email address',
    magic: 'Send sign-in link',
    sent: 'Sign-in link sent. Check your inbox.',
    captchaUnavailable: 'The security check is temporarily unavailable. Try again shortly.',
    signOut: 'Sign out',
    refresh: 'Refresh access',
    signedIn: 'Signed in',
    loading: 'Loading…',
    free: 'Free',
    pro: 'RhythmCoach Pro',
    manage: 'Manage subscription',
    close: 'Close',
    displayName: 'Display name',
    saveName: 'Save name',
    saved: 'Name saved.',
    benefits: 'Free and RhythmCoach Pro',
    featureDownload: 'Pro · Download locally recorded audio files',
    featureMaterials: 'Pro · Save and sync your personal script library across devices',
    featureTraining: 'Free · Core rehearsal, recording, and pacing feedback',
    localFirst: 'Data boundary',
    proKicker: 'PRO · OPTIONAL SUPPORT',
    proTitle: 'Upgrade to RhythmCoach Pro',
    proBody: 'US$1/month unlocks recording downloads and a cross-device personal library while supporting ongoing maintenance. Core rehearsal stays free.',
    proPrice: 'US$1 / month',
    becomePro: 'Upgrade to RhythmCoach Pro',
    guestSteps: '1 Sign in · 2 Pay with Stripe · 3 Pro activates',
    guestHint: 'Continue with Google or email to upgrade',
    stripeNote: 'Secure checkout with Stripe · Cancel anytime',
    proAccess: 'Pro access active',
    grantedBody: 'This account already has RhythmCoach Pro access and no paid subscription currently needs renewal or cancellation.',
    paidActive: 'Pro subscription active',
    renewsBody: 'Your current Pro access comes from an active subscription. It renews on {date}; Stripe securely manages payment method, cancellation, and billing details.',
    trialActive: 'PRO · FREE TRIAL',
    trialBody: 'Your free trial runs through {date}. This is a manageable Stripe subscription: you can review it, manage payment details, or cancel at any time.',
    cancellationScheduled: 'Cancellation scheduled',
    cancellationBody: 'This subscription is scheduled to cancel and will not renew. RhythmCoach Pro remains active through {date}.',
    paymentAttention: 'Payment needs attention',
    paymentAttentionBody: 'Stripe currently marks this subscription as awaiting payment. Pro access follows the server-side entitlement result; open subscription management to review your payment method.',
    billingSuccess: 'Payment complete. Pro access is up to date.',
    billingPending: 'Payment complete. Pro access is still being confirmed and should sync shortly.',
    billingCancelled: 'Payment was not completed. Core rehearsal and Free access are unchanged.',
    billingUnavailable: 'Stripe checkout or subscription management is temporarily unavailable. Your account and current access are unaffected.'
  }
} as const;

const localizedServiceErrors: Record<string, string> = {
  'Membership service failed to load. Training remains available.': '账户服务加载失败，但训练功能仍可使用。',
  'Membership access could not be refreshed.': '无法刷新账户与会员权益。',
  'Complete the security check first.': '请先完成人机验证。'
};

function localizeMembershipError(error: string, lang: Language): string {
  if (lang === 'en') {
    if (error.includes('Membership request failed') || error.includes('Stripe')) return copy.en.billingUnavailable;
    return error;
  }
  if (error.includes('Membership request failed') || error.includes('Stripe')) return copy.zh.billingUnavailable;
  return localizedServiceErrors[error] ?? error;
}

function formatSubscriptionDate(value: string | null | undefined, lang: Language): string {
  if (!value) return lang === 'zh' ? '当前周期结束日' : 'the current period end date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return lang === 'zh' ? '当前周期结束日' : 'the current period end date';
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  }).format(date);
}

function GoogleMark() {
  return (
    <svg className="membership-provider-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.54l3.35-2.61Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.61C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}

export function MembershipButton({ lang }: { lang: Language }) {
  const membership = useMembership();
  if (!membership.configured) return null;
  const text = copy[lang];

  return (
    <button
      type="button"
      className={`header-icon-action membership-header-action ${membership.user ? 'is-signed-in' : ''} ${membership.isPro ? 'is-pro' : ''}`}
      onClick={membership.openDialog}
      title={text.account}
      aria-label={text.account}
    >
      {membership.profile?.avatar_url ? (
        <img className="membership-header-avatar" src={membership.profile.avatar_url} alt="" referrerPolicy="no-referrer" />
      ) : (
        <UserCircle size={18} />
      )}
    </button>
  );
}

export function MembershipDialog({ lang }: { lang: Language }) {
  const membership = useMembership();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaEpoch, setCaptchaEpoch] = useState(0);
  const [authError, setAuthError] = useState('');
  const text = copy[lang];

  useEffect(() => {
    setDisplayName(membership.profile?.display_name ?? '');
  }, [membership.profile?.display_name]);

  if (!membership.dialogOpen) return null;

  const sendMagicLink = async () => {
    const normalized = email.trim();
    if (!normalized || !captchaToken) return;
    setBusy(true);
    setSent(false);
    setAuthError('');
    try {
      await membership.sendMagicLink(normalized, captchaToken);
      setSent(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : text.captchaUnavailable;
      setAuthError(localizeMembershipError(message, lang));
    } finally {
      setCaptchaToken('');
      setCaptchaEpoch((value) => value + 1);
      setBusy(false);
    }
  };

  const saveName = async () => {
    setBusy(true);
    setSaved(false);
    try {
      await membership.saveDisplayName(displayName);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  const avatarUrl = membership.profile?.avatar_url;
  const accessLabel = membership.isPro ? text.pro : text.free;
  const subscription = membership.subscription;
  const periodEnd = formatSubscriptionDate(subscription?.current_period_end, lang);
  const isTrialing = subscription?.status === 'trialing';
  const needsPayment = subscription?.status === 'past_due' || subscription?.status === 'unpaid';
  const cancellationScheduled = subscription?.cancel_at_period_end === true;

  let subscriptionKicker = text.paidActive;
  let subscriptionBody = text.renewsBody.replace('{date}', periodEnd);
  if (isTrialing) {
    subscriptionKicker = text.trialActive;
    subscriptionBody = text.trialBody.replace('{date}', periodEnd);
  } else if (needsPayment) {
    subscriptionKicker = text.paymentAttention;
    subscriptionBody = text.paymentAttentionBody;
  } else if (cancellationScheduled) {
    subscriptionKicker = text.cancellationScheduled;
    subscriptionBody = text.cancellationBody.replace('{date}', periodEnd);
  }

  const billingMessage = membership.billingReturn === 'cancelled'
    ? text.billingCancelled
    : membership.billingReturn === 'success'
      ? (membership.isPro ? text.billingSuccess : text.billingPending)
      : null;

  return (
    <div className="membership-backdrop" role="presentation" onMouseDown={membership.closeDialog}>
      <section
        className="membership-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="membership-eyebrow">{accessLabel}</span>
            <h2 id="membership-title">{text.title}</h2>
          </div>
          <button type="button" className="membership-close" onClick={membership.closeDialog} aria-label={text.close}>
            <X size={18} />
          </button>
        </header>

        <p className="membership-intro">{text.intro}</p>

        <section className="membership-capabilities" aria-labelledby="membership-capabilities-title">
          <strong id="membership-capabilities-title"><Sparkles size={16} /> {text.benefits}</strong>
          <ul>
            <li>{text.featureTraining}</li>
            <li>{text.featureDownload}</li>
            <li>{text.featureMaterials}</li>
          </ul>
        </section>

        {membership.user ? (
          <div className="membership-signed-in">
            <section className="membership-identity-card">
              <div className="membership-avatar">
                {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : <UserCircle size={24} />}
              </div>
              <div>
                <strong>{membership.profile?.display_name || membership.user.email || text.signedIn}</strong>
                <span>{membership.user.email ?? text.signedIn}</span>
              </div>
              <em className={membership.isPro ? 'is-pro' : ''}>{accessLabel}</em>
            </section>

            {membership.billingEnabled && (
              <section className={`membership-pro-card ${membership.isPro ? 'is-active' : ''}`}>
                <div className="membership-pro-copy">
                  <span className="membership-pro-kicker">
                    {membership.isPro
                      ? (membership.hasPaidSubscription ? subscriptionKicker : text.proAccess)
                      : text.proKicker}
                  </span>
                  <strong>{membership.isPro ? text.pro : text.proTitle}</strong>
                  <p>
                    {membership.isPro
                      ? (membership.hasPaidSubscription ? subscriptionBody : text.grantedBody)
                      : text.proBody}
                  </p>
                </div>
                <div className="membership-pro-action">
                  {!membership.isPro && (
                    <>
                      <span className="membership-pro-price">{text.proPrice}</span>
                      <button type="button" className="membership-pro-cta" disabled={membership.loading} onClick={() => void membership.startCheckout()}>
                        <CreditCard size={16} /> {text.becomePro}
                      </button>
                      <small>{text.stripeNote}</small>
                    </>
                  )}
                  {membership.isPro && membership.hasPaidSubscription && (
                    <button type="button" disabled={membership.loading} onClick={() => void membership.openPortal()}>
                      <CreditCard size={16} /> {text.manage}
                    </button>
                  )}
                </div>
              </section>
            )}

            <form className="membership-profile-form" onSubmit={(event) => { event.preventDefault(); void saveName(); }}>
              <label>
                {text.displayName}
                <input
                  type="text"
                  maxLength={80}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>
              <button type="submit" disabled={busy || membership.loading}>
                <Save size={16} /> {text.saveName}
              </button>
            </form>
            {saved && <span className="membership-success">{text.saved}</span>}

            <div className="membership-actions-row">
              <button type="button" onClick={() => void membership.refreshEntitlements()}>
                <RefreshCw size={16} /> {text.refresh}
              </button>
              <button type="button" onClick={() => void membership.signOut()}>
                <LogOut size={16} /> {text.signOut}
              </button>
            </div>
          </div>
        ) : (
          <div className="membership-sign-in">
            {membership.billingEnabled && (
              <section className="membership-pro-card">
                <div className="membership-pro-copy">
                  <span className="membership-pro-kicker">{text.proKicker}</span>
                  <strong>{text.proTitle}</strong>
                  <p>{text.proBody}</p>
                </div>
                <div className="membership-pro-action">
                  <span className="membership-pro-price">{text.proPrice}</span>
                  <small>{text.guestSteps}</small>
                  <small>{text.stripeNote}</small>
                </div>
              </section>
            )}
            <span className="membership-optional-chip">{text.guestHint}</span>
            <div className="membership-provider-list">
              <button
                type="button"
                className="membership-provider-button"
                disabled={busy || membership.loading}
                onClick={() => void membership.signInWithProvider('google')}
              >
                <GoogleMark />
                <span>{text.google}</span>
              </button>
            </div>
            <div className="membership-divider"><span>{text.or}</span></div>
            <div className="membership-email-row">
              <Mail size={16} aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={text.email}
                aria-label={text.email}
              />
              <button type="button" disabled={busy || !email.trim() || !captchaToken} onClick={() => void sendMagicLink()}>
                {text.magic}
              </button>
            </div>
            <TurnstileWidget
              key={captchaEpoch}
              siteKey={membershipConfig.turnstileSiteKey}
              onToken={setCaptchaToken}
              onUnavailable={() => setAuthError(text.captchaUnavailable)}
            />
            {sent && <span className="membership-success">{text.sent}</span>}
            {authError && <div className="membership-error">{authError}</div>}
          </div>
        )}

        {billingMessage && <div className="membership-notice">{billingMessage}</div>}

        <footer className="membership-privacy">
          <strong><Cloud size={15} /> {text.localFirst}</strong>
          <span>{text.privacy}</span>
        </footer>

        {membership.loading && <small>{text.loading}</small>}
        {membership.error && <div className="membership-error">{localizeMembershipError(membership.error, lang)}</div>}
      </section>
    </div>
  );
}
