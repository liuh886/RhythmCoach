import { useEffect, useState } from 'react';
import {
  Cloud,
  CreditCard,
  Github,
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
import { membershipConfig } from './config';
import { useMembership } from './MembershipProvider';
import { TurnstileWidget } from './TurnstileWidget';
import './membership.css';

const copy = {
  zh: {
    account: '账户',
    title: 'RhythmCoach 账户',
    intro: '登录 Hao Apps 账户可管理 RhythmCoach Pro。训练本身保持免费，会员用于解锁跨设备个人素材与录音下载。',
    privacy: '录音永远只保存在本机浏览器，绝不会上传或在线保存；只有你主动保存到“个人素材库”的文字素材会同步到云端。',
    google: '使用 Google 登录',
    github: '使用 GitHub 登录',
    x: '使用 X 登录',
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
    upgrade: '升级 · US$1/月',
    manage: '管理订阅',
    close: '关闭账户窗口',
    displayName: '显示名称',
    saveName: '保存名称',
    saved: '名称已保存。',
    benefits: '会员权益',
    featureDownload: '下载本地录音文件',
    featureMaterials: '在线保存并跨设备同步个人素材库',
    featureTraining: '核心排练、录音与节奏反馈继续免费',
    localFirst: '数据边界'
  },
  en: {
    account: 'Account',
    title: 'RhythmCoach account',
    intro: 'Sign in with Hao Apps to manage RhythmCoach Pro. Core rehearsal stays free; membership unlocks recording downloads and a cloud-synced personal library.',
    privacy: 'Recordings always stay in this browser and are never uploaded or stored online. Only text you explicitly save to your personal library is synced to the cloud.',
    google: 'Continue with Google',
    github: 'Continue with GitHub',
    x: 'Continue with X',
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
    upgrade: 'Upgrade · US$1/month',
    manage: 'Manage subscription',
    close: 'Close account dialog',
    displayName: 'Display name',
    saveName: 'Save name',
    saved: 'Name saved.',
    benefits: 'Membership benefits',
    featureDownload: 'Download locally recorded audio files',
    featureMaterials: 'Save and sync your personal script library across devices',
    featureTraining: 'Core rehearsal, recording, and pacing feedback stay free',
    localFirst: 'Data boundary'
  }
} as const;

const localizedServiceErrors: Record<string, string> = {
  'Membership service failed to load. Training remains available.': '账户服务加载失败，但训练功能仍可使用。',
  'Membership access could not be refreshed.': '无法刷新账户与会员权益。',
  'Complete the security check first.': '请先完成人机验证。'
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
            <li>{text.featureDownload}</li>
            <li>{text.featureMaterials}</li>
            <li>{text.featureTraining}</li>
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
                  <CreditCard size={16} /> {text.manage}</button>
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
            <div className="membership-provider-list">
              <button type="button" className="membership-primary" onClick={() => void membership.signInWithProvider('google')}>
                <LogIn size={17} /> {text.google}
              </button>
              <button type="button" className="membership-provider" onClick={() => void membership.signInWithProvider('github')}>
                <Github size={17} /> {text.github}
              </button>
              <button type="button" className="membership-provider" onClick={() => void membership.signInWithProvider('x')}>
                <X size={17} /> {text.x}
              </button>
            </div>
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
