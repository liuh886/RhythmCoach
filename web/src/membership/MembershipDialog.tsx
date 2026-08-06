import { useEffect, useState } from 'react';
import {
  Cloud,
  CreditCard,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  Sparkles,
  UserCircle,
  X
} from 'lucide-react';
import type { Language } from '../types';
import { useMembership } from './MembershipProvider';
import './membership.css';

const copy = {
  zh: {
    account: '账户',
    title: 'RhythmCoach 账户',
    intro: '使用一个 Hao Apps 账户建立训练身份、保存轻量偏好，并为未来训练历史与高级材料做好准备。',
    privacy: '稿件、训练记录和录音仍默认保存在当前浏览器，不会上传到共享账户。',
    google: '使用 Google 登录',
    email: '邮箱地址',
    magic: '发送登录链接',
    sent: '登录链接已发送，请检查邮箱。',
    signOut: '退出登录',
    refresh: '刷新账户',
    signedIn: '已登录',
    loading: '正在加载…',
    free: 'Free',
    pro: 'RhythmCoach Pro',
    upgrade: '升级 · US$1/月',
    manage: '管理订阅',
    coming: '付费功能尚未开放，当前训练和录音下载保持可用。',
    close: '关闭账户窗口',
    displayName: '显示名称',
    saveName: '保存名称',
    saved: '名称已保存。',
    future: '账户能力',
    featureHistory: '未来同步训练历史与跨设备偏好',
    featureMaterials: '未来解锁高级训练材料与可解释反馈',
    featureIdentity: '与其他 Hao Apps 共用同一登录身份',
    localFirst: '本地数据边界'
  },
  en: {
    account: 'Account',
    title: 'RhythmCoach account',
    intro: 'Use one Hao Apps account to establish your training identity, keep lightweight preferences, and prepare for future history and advanced materials.',
    privacy: 'Scripts, training records, and recordings remain in this browser by default and are not uploaded to the shared account.',
    google: 'Continue with Google',
    email: 'Email address',
    magic: 'Send sign-in link',
    sent: 'Sign-in link sent. Check your inbox.',
    signOut: 'Sign out',
    refresh: 'Refresh account',
    signedIn: 'Signed in',
    loading: 'Loading…',
    free: 'Free',
    pro: 'RhythmCoach Pro',
    upgrade: 'Upgrade · US$1/month',
    manage: 'Manage subscription',
    coming: 'Paid features are not open yet. Current training and recording downloads remain available.',
    close: 'Close account dialog',
    displayName: 'Display name',
    saveName: 'Save name',
    saved: 'Name saved.',
    future: 'Account capabilities',
    featureHistory: 'Prepare for training history and cross-device preferences',
    featureMaterials: 'Prepare for advanced materials and explainable feedback',
    featureIdentity: 'Use the same identity across Hao Apps',
    localFirst: 'Local data boundary'
  }
} as const;

const localizedServiceErrors: Record<string, string> = {
  'Membership service failed to load. Training remains available.': '账户服务加载失败，但训练功能仍可使用。',
  'Membership access could not be refreshed.': '无法刷新账户与会员权益。'
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
  const text = copy[lang];

  useEffect(() => {
    setDisplayName(membership.profile?.display_name ?? '');
  }, [membership.profile?.display_name]);

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
            <span className="membership-eyebrow">{membership.isPro ? text.pro : 'HAO APPS · ACCOUNT'}</span>
            <h2 id="membership-title">{text.title}</h2>
          </div>
          <button type="button" className="membership-close" onClick={membership.closeDialog} aria-label={text.close}>
            <X size={18} />
          </button>
        </header>

        <p className="membership-intro">{text.intro}</p>

        <section className="membership-capabilities" aria-labelledby="membership-capabilities-title">
          <strong id="membership-capabilities-title"><Sparkles size={16} /> {text.future}</strong>
          <ul>
            <li>{text.featureHistory}</li>
            <li>{text.featureMaterials}</li>
            <li>{text.featureIdentity}</li>
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
              <em className={membership.isPro ? 'is-pro' : ''}>{membership.isPro ? text.pro : text.free}</em>
            </section>

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
            <span className="membership-optional-chip">OPTIONAL SIGN-IN</span>
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

        <footer className="membership-privacy">
          <strong><Cloud size={15} /> {text.localFirst}</strong>
          <span>{text.privacy}</span>
        </footer>

        {!membership.billingEnabled && <small>{text.coming}</small>}
        {membership.loading && <small>{text.loading}</small>}
        {membership.error && <div className="membership-error">{localizeMembershipError(membership.error, lang)}</div>}
      </section>
    </div>
  );
}
