import { useState } from 'react';
import { Crown, CreditCard, LogIn, LogOut, Mail, RefreshCw, UserCircle, X } from 'lucide-react';
import type { Language } from '../types';
import { useMembership } from './MembershipProvider';
import './membership.css';

const copy = {
  zh: {
    account: '账户',
    title: 'RhythmCoach 账户',
    intro: '账户用于验证会员权益。稿件、训练记录和录音仍默认保存在当前浏览器。',
    google: '使用 Google 登录',
    email: '邮箱地址',
    magic: '发送登录链接',
    sent: '登录链接已发送，请检查邮箱。',
    signOut: '退出登录',
    refresh: '刷新权益',
    signedIn: '已登录',
    loading: '正在加载…',
    free: 'Free',
    pro: 'RhythmCoach Pro',
    upgrade: '升级 · US$1/月',
    manage: '管理订阅',
    coming: '支付开关尚未启用，现阶段下载录音仍保持免费。',
    close: '关闭账户窗口'
  },
  en: {
    account: 'Account',
    title: 'RhythmCoach account',
    intro: 'Your account verifies membership access. Scripts, sessions and recordings remain in this browser by default.',
    google: 'Continue with Google',
    email: 'Email address',
    magic: 'Send sign-in link',
    sent: 'Sign-in link sent. Check your inbox.',
    signOut: 'Sign out',
    refresh: 'Refresh access',
    signedIn: 'Signed in',
    loading: 'Loading…',
    free: 'Free',
    pro: 'RhythmCoach Pro',
    upgrade: 'Upgrade · US$1/month',
    manage: 'Manage subscription',
    coming: 'Billing is not enabled yet, so recording downloads remain free for now.',
    close: 'Close account dialog'
  }
} as const;

const localizedServiceErrors: Record<string, string> = {
  'Membership service failed to load. Training remains available.': '会员服务加载失败，但训练功能仍可使用。',
  'Membership access could not be refreshed.': '无法刷新会员权益。'
};

function localizeMembershipError(error: string, lang: Language): string {
  if (lang === 'en') return error;
  return localizedServiceErrors[error] ?? error;
}

export function MembershipButton({ lang }: { lang: Language }) {
  const membership = useMembership();
  if (!membership.configured) return null;
  const text = copy[lang];

  return (
    <button
      type="button"
      className={`header-icon-action membership-header-action ${membership.isPro ? 'is-pro' : ''}`}
      onClick={membership.openDialog}
      title={text.account}
      aria-label={text.account}
    >
      {membership.isPro ? <Crown size={18} /> : <UserCircle size={18} />}
    </button>
  );
}

export function MembershipDialog({ lang }: { lang: Language }) {
  const membership = useMembership();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const text = copy[lang];

  if (!membership.dialogOpen) return null;

  const sendMagicLink = async () => {
    const normalized = email.trim();
    if (!normalized) return;
    setBusy(true);
    setSent(false);
    try {
      await membership.sendMagicLink(normalized);
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

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
            <span className="membership-eyebrow">{membership.isPro ? text.pro : text.free}</span>
            <h2 id="membership-title">{text.title}</h2>
          </div>
          <button type="button" className="membership-close" onClick={membership.closeDialog} aria-label={text.close}>
            <X size={18} />
          </button>
        </header>

        <p>{text.intro}</p>

        {membership.user ? (
          <div className="membership-signed-in">
            <strong>{membership.user.email ?? text.signedIn}</strong>
            <span>{membership.isPro ? text.pro : text.free}</span>
            <div className="membership-actions-row">
              {membership.billingEnabled && !membership.isPro && (
                <button type="button" onClick={() => void membership.startCheckout()}>
                  <CreditCard size={16} /> {text.upgrade}
                </button>
              )}
              {membership.billingEnabled && membership.isPro && (
                <button type="button" onClick={() => void membership.openPortal()}>
                  <CreditCard size={16} /> {text.manage}
                </button>
              )}
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
            <button type="button" className="membership-primary" onClick={() => void membership.signInWithGoogle()}>
              <LogIn size={17} /> {text.google}
            </button>
            <div className="membership-email-row">
              <Mail size={16} aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={text.email}
                aria-label={text.email}
              />
              <button type="button" disabled={busy || !email.trim()} onClick={() => void sendMagicLink()}>
                {text.magic}
              </button>
            </div>
            {sent && <span className="membership-success">{text.sent}</span>}
          </div>
        )}

        {!membership.billingEnabled && <small>{text.coming}</small>}
        {membership.loading && <small>{text.loading}</small>}
        {membership.error && <div className="membership-error">{localizeMembershipError(membership.error, lang)}</div>}
      </section>
    </div>
  );
}
