import { useState } from 'react';
import { Crown, LogIn, LogOut, Mail, RefreshCw, UserCircle, X } from 'lucide-react';
import type { Language } from '../types';
import { RECORDING_DOWNLOAD_ENTITLEMENT } from '../domain/recordingDownloadAccess';
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
    pro: '录音下载会员',
    coming: '支付尚未启用，现阶段下载录音仍保持免费。',
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
    pro: 'Recording download member',
    coming: 'Payments are not enabled yet, so recording downloads remain free for now.',
    close: 'Close account dialog'
  }
} as const;

export function MembershipButton({ lang }: { lang: Language }) {
  const membership = useMembership();
  if (!membership.configured) return null;
  const isPro = membership.hasEntitlement(RECORDING_DOWNLOAD_ENTITLEMENT);
  const text = copy[lang];

  return (
    <button
      type="button"
      className={`header-icon-action membership-header-action ${isPro ? 'is-pro' : ''}`}
      onClick={membership.openDialog}
      title={text.account}
      aria-label={text.account}
    >
      {isPro ? <Crown size={18} /> : <UserCircle size={18} />}
    </button>
  );
}

export function MembershipDialog({ lang }: { lang: Language }) {
  const membership = useMembership();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const text = copy[lang];
  const isPro = membership.hasEntitlement(RECORDING_DOWNLOAD_ENTITLEMENT);

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
            <span className="membership-eyebrow">{isPro ? text.pro : text.free}</span>
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
            <span>{isPro ? text.pro : text.free}</span>
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

        {!membership.enforcementEnabled && <small>{text.coming}</small>}
        {membership.loading && <small>{text.loading}</small>}
        {membership.error && <div className="membership-error">{membership.error}</div>}
      </section>
    </div>
  );
}
