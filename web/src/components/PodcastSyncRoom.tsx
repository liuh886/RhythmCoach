import './PodcastSyncRoom.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Link2, LogIn, LogOut, Share2, ShieldCheck, UsersRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ensurePodcastSyncIdentity, hasPodcastSyncIdentity, roomIdentityDisplayName } from '../domain/podcastSyncIdentity';
import { hashForPodcastSyncInvite, normalizePodcastSyncRoomCode } from '../domain/productSurface';
import { membershipConfig } from '../membership/config';
import { useMembership } from '../membership/MembershipProvider';
import { TurnstileWidget } from '../membership/TurnstileWidget';
import { getSupabaseClient, type RealtimeChannelLike, type SupabaseUser } from '../supabase/client';
import type { Language } from '../types';
import { PrompterTopbarPortal } from './PrompterTopbarPortal';

interface RoomRecord {
  id: string;
  room_code: string;
  host_user_id: string;
  title: string;
  script: string;
  delivery_markup: string | null;
  expires_at: string;
}

interface MemberRecord {
  room_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  can_scroll: boolean;
  joined_at: string;
  last_seen_at: string;
}

export interface PodcastSyncContent {
  title: string;
  script: string;
  deliveryMarkup: string;
}

export type PodcastRoomEntrySource = 'home' | 'invite';

interface PodcastSyncRoomProps {
  title: string;
  script: string;
  deliveryMarkup: string;
  lang: Language;
  prompterActive: boolean;
  entryOpen: boolean;
  entryRoomCode?: string | null;
  entrySource?: PodcastRoomEntrySource;
  onEntryDismiss: () => void;
  onEntryJoined: () => void;
  onRoomExit: () => void;
  onRoomContentChange: (content: PodcastSyncContent | null) => void;
}

interface RoomRpcResult {
  room_id: string;
  room_code: string;
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

const MAX_MEMBERS = 4;
const SCROLL_BROADCAST_INTERVAL_MS = 80;
const REMOTE_SCROLL_GUARD_MS = 160;
const LOCAL_INTENT_MS = 700;
const PANEL_ID = 'podcast-sync-panel';
const PANEL_TITLE_ID = 'podcast-sync-panel-title';

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function roomErrorMessage(message: string, lang: Language): string {
  if (message.includes('room_full')) return lang === 'zh' ? '房间已满，最多 4 人。' : 'This room is full (4 people maximum).';
  if (message.includes('room_not_found')) return lang === 'zh' ? '没有找到这个房间，或房间已经过期。' : 'Room not found or expired.';
  if (message.includes('account_required')) return lang === 'zh' ? '创建房间需要登录账号。' : 'Sign in with an account to create a room.';
  if (message.includes('captcha_required') || message.includes('captcha protection')) return lang === 'zh' ? '请先完成安全验证。' : 'Complete the security check first.';
  if (message.includes('authentication_required')) return lang === 'zh' ? '无法建立房间身份，请重试。' : 'Could not establish a room identity. Please try again.';
  if (message.includes('Anonymous sign-ins are disabled')) return lang === 'zh' ? '游客加入暂不可用，请稍后重试。' : 'Guest joining is temporarily unavailable.';
  return lang === 'zh' ? '同步房间操作失败，请重试。' : 'Podcast sync failed. Please try again.';
}

function getPrompterScroll(): HTMLDivElement | null {
  return document.querySelector<HTMLDivElement>('.prompter-scroll');
}

function readScrollProgress(): number {
  const element = getPrompterScroll();
  if (!element) return 0;
  const maxScroll = Math.max(1, element.scrollHeight - element.clientHeight);
  return clampProgress(element.scrollTop / maxScroll);
}

function buildInviteUrl(roomCode: string): string {
  const url = new URL(window.location.href);
  url.hash = hashForPodcastSyncInvite(roomCode);
  return url.toString();
}

export function PodcastSyncRoom({
  title,
  script,
  deliveryMarkup,
  lang,
  prompterActive,
  entryOpen,
  entryRoomCode = null,
  entrySource = 'home',
  onEntryDismiss,
  onEntryJoined,
  onRoomExit,
  onRoomContentChange
}: PodcastSyncRoomProps) {
  const { user: accountUser, profile, openDialog } = useMembership();
  const [panelOpen, setPanelOpen] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState(entryRoomCode ?? '');
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [roomUser, setRoomUser] = useState<SupabaseUser | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [hasRoomIdentitySession, setHasRoomIdentitySession] = useState<boolean | null>(accountUser ? true : null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaEpoch, setCaptchaEpoch] = useState(0);
  const [captchaUnavailable, setCaptchaUnavailable] = useState('');

  const channelRef = useRef<RealtimeChannelLike | null>(null);
  const applyingRemoteUntilRef = useRef(0);
  const localIntentUntilRef = useRef(0);
  const sharedProgressRef = useRef(0);
  const lastBroadcastAtRef = useRef(0);
  const pendingProgressRef = useRef<number | null>(null);
  const broadcastTimerRef = useRef<number | null>(null);
  const seqRef = useRef(0);
  const roomRef = useRef<RoomRecord | null>(null);
  const roomUserRef = useRef<SupabaseUser | null>(null);
  const membersRef = useRef<MemberRecord[]>([]);
  const joinedFromEntryRef = useRef(false);
  const entryTransitionRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const panelWasOpenRef = useRef(false);

  roomRef.current = room;
  roomUserRef.current = roomUser;
  membersRef.current = members;

  const panelVisible = entryOpen || panelOpen;
  const isExternalEntry = entryOpen && !room;
  const needsGuestVerification = !accountUser && hasRoomIdentitySession === false;
  const joinIdentityReady = Boolean(accountUser)
    || hasRoomIdentitySession === true
    || (needsGuestVerification && Boolean(captchaToken));
  const currentMember = useMemo(
    () => members.find((member) => member.user_id === roomUser?.id) ?? null,
    [members, roomUser?.id]
  );
  const isHost = Boolean(room && roomUser && room.host_user_id === roomUser.id);
  const canScroll = Boolean(currentMember?.can_scroll);
  const remainingSlots = Math.max(0, MAX_MEMBERS - members.length);

  useEffect(() => {
    if (!entryOpen || room) return;
    const normalized = normalizePodcastSyncRoomCode(entryRoomCode ?? '');
    setRoomCodeInput(normalized ?? '');
    setError('');
  }, [entryOpen, entryRoomCode, room]);

  useEffect(() => {
    if (!panelVisible || room) return;
    let active = true;
    if (accountUser) {
      setHasRoomIdentitySession(true);
      setCaptchaToken('');
      setCaptchaUnavailable('');
      return;
    }
    setHasRoomIdentitySession(null);
    void hasPodcastSyncIdentity()
      .then((hasIdentity) => {
        if (!active) return;
        setHasRoomIdentitySession(hasIdentity);
        if (hasIdentity) {
          setCaptchaToken('');
          setCaptchaUnavailable('');
        }
      })
      .catch((identityError: unknown) => {
        if (!active) return;
        setHasRoomIdentitySession(false);
        setError(roomErrorMessage(identityError instanceof Error ? identityError.message : '', lang));
      });
    return () => { active = false; };
  }, [accountUser, lang, panelVisible, room]);

  const closePanel = useCallback(() => {
    if (isExternalEntry) {
      onEntryDismiss();
      return;
    }
    setPanelOpen(false);
  }, [isExternalEntry, onEntryDismiss]);

  const connectionLabel = room
    ? connectionState === 'connected'
      ? (lang === 'zh' ? '实时同步中' : 'Live sync')
      : connectionState === 'disconnected'
        ? (lang === 'zh' ? '连接已中断，正在重连' : 'Reconnecting…')
        : (lang === 'zh' ? '正在连接' : 'Connecting')
    : '';

  useEffect(() => {
    if (!panelVisible) return;
    const frame = window.requestAnimationFrame(() => {
      const preferred = panelRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]');
      const firstControl = preferred ?? panelRef.current?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      firstControl?.focus();
    });
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closePanel();
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleEscape, true);
    };
  }, [closePanel, panelVisible]);

  useEffect(() => {
    if (panelVisible) {
      panelWasOpenRef.current = true;
      return;
    }
    if (!panelWasOpenRef.current) return;
    panelWasOpenRef.current = false;
    if (prompterActive) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, [panelVisible, prompterActive]);

  const applyRemoteProgress = useCallback((progress: number) => {
    const normalized = clampProgress(progress);
    sharedProgressRef.current = normalized;
    const element = getPrompterScroll();
    if (!element) return;
    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
    applyingRemoteUntilRef.current = performance.now() + REMOTE_SCROLL_GUARD_MS;
    element.scrollTop = normalized * maxScroll;
  }, []);

  const refreshMembers = useCallback(async (roomId: string) => {
    const client = getSupabaseClient();
    if (!client) return;
    const result = await client.from<MemberRecord>('rhythmcoach_sync_members')
      .select('room_id,user_id,display_name,avatar_url,can_scroll,joined_at,last_seen_at')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });
    if (!result.error) setMembers(result.data ?? []);
  }, []);

  const disconnectChannel = useCallback(async () => {
    if (broadcastTimerRef.current !== null) {
      window.clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }
    const channel = channelRef.current;
    channelRef.current = null;
    if (channel) {
      const client = getSupabaseClient();
      if (client) await client.removeChannel(channel).catch(() => undefined);
    }
    setConnectionState('idle');
    setOnlineUserIds(new Set());
  }, []);

  const clearRoom = useCallback(async (message = '') => {
    roomRef.current = null;
    roomUserRef.current = null;
    await disconnectChannel();
    setRoom(null);
    setRoomUser(null);
    setMembers([]);
    onRoomContentChange(null);
    if (message) setError(message);
  }, [disconnectChannel, onRoomContentChange]);

  const broadcast = useCallback(async (event: string, payload: Record<string, unknown>) => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({ type: 'broadcast', event, payload }).catch(() => undefined);
  }, []);

  const loadRoom = useCallback(async (roomId: string, identity: SupabaseUser) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('sync_unavailable');
    const result = await client.from<RoomRecord>('rhythmcoach_sync_rooms')
      .select('id,room_code,host_user_id,title,script,delivery_markup,expires_at')
      .eq('id', roomId)
      .single();
    if (result.error || !result.data) throw new Error(result.error?.message ?? 'room_not_found');
    roomRef.current = result.data;
    roomUserRef.current = identity;
    setRoom(result.data);
    setRoomUser(identity);
    setError('');
    onRoomContentChange({
      title: result.data.title,
      script: result.data.script,
      deliveryMarkup: result.data.delivery_markup ?? result.data.script
    });
    await refreshMembers(result.data.id);
  }, [onRoomContentChange, refreshMembers]);

  useEffect(() => {
    if (!prompterActive || !room || !roomUser || channelRef.current) return;
    const client = getSupabaseClient();
    if (!client) return;
    let active = true;
    setConnectionState('connecting');
    const channel = client.channel(`rhythmcoach:podcast:${room.id}`, {
      config: { private: true, presence: { key: roomUser.id } }
    });
    channelRef.current = channel;
    channel
      .on('broadcast', { event: 'scroll' }, ({ payload }) => {
        if (!payload || payload.sender_id === roomUser.id) return;
        const progress = Number(payload.progress);
        if (Number.isFinite(progress)) applyRemoteProgress(progress);
      })
      .on('broadcast', { event: 'sync-request' }, ({ payload }) => {
        if (room.host_user_id !== roomUser.id || payload?.sender_id === roomUser.id) return;
        void channel.send({ type: 'broadcast', event: 'snapshot', payload: { sender_id: roomUser.id, progress: readScrollProgress() } });
      })
      .on('broadcast', { event: 'snapshot' }, ({ payload }) => {
        if (!payload || payload.sender_id === roomUser.id) return;
        const progress = Number(payload.progress);
        if (Number.isFinite(progress)) applyRemoteProgress(progress);
      })
      .on('broadcast', { event: 'room-state-changed' }, () => { void refreshMembers(room.id); })
      .on('broadcast', { event: 'room-closed' }, ({ payload }) => {
        if (payload?.sender_id === roomUser.id) return;
        void clearRoom(lang === 'zh' ? '房主已结束同步房间。' : 'The host ended this sync room.');
        onRoomExit();
      })
      .on('presence', { event: 'sync' }, () => {
        const nextOnline = new Set<string>();
        Object.values(channel.presenceState()).flat().forEach((presence) => {
          if (typeof presence.user_id === 'string') nextOnline.add(presence.user_id);
        });
        setOnlineUserIds(nextOnline);
      })
      .subscribe((status) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected');
          sharedProgressRef.current = readScrollProgress();
          void channel.track({
            user_id: roomUser.id,
            display_name: profile?.id === roomUser.id && profile.display_name ? profile.display_name : roomIdentityDisplayName(roomUser, lang)
          });
          void client.rpc<void>('rhythmcoach_touch_sync_room', { p_room_id: room.id });
          void channel.send({ type: 'broadcast', event: 'sync-request', payload: { sender_id: roomUser.id } });
          void channel.send({ type: 'broadcast', event: 'room-state-changed', payload: { sender_id: roomUser.id } });
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (roomRef.current?.id === room.id) setConnectionState('disconnected');
          return;
        }
        if (roomRef.current?.id === room.id) setConnectionState('connecting');
      });
    return () => {
      active = false;
      if (channelRef.current === channel) channelRef.current = null;
      void client.removeChannel(channel).catch(() => undefined);
    };
  }, [applyRemoteProgress, clearRoom, lang, onRoomExit, profile?.display_name, profile?.id, prompterActive, refreshMembers, room, roomUser]);

  const createRoom = useCallback(async () => {
    if (!accountUser) {
      openDialog();
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;
    setBusy(true);
    setError('');
    joinedFromEntryRef.current = false;
    entryTransitionRef.current = false;
    try {
      const result = await client.rpc<RoomRpcResult>('rhythmcoach_create_sync_room', {
        p_title: title.trim() || (lang === 'zh' ? '同步播客' : 'Podcast sync'),
        p_script: script,
        p_delivery_markup: deliveryMarkup || script
      });
      if (result.error || !result.data) throw new Error(result.error?.message ?? 'create_failed');
      await loadRoom(result.data.room_id, accountUser);
      setPanelOpen(true);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '';
      if (message.includes('account_required')) openDialog();
      setError(roomErrorMessage(message, lang));
    } finally {
      setBusy(false);
    }
  }, [accountUser, deliveryMarkup, lang, loadRoom, openDialog, script, title]);

  const resetGuestVerification = useCallback(() => {
    setCaptchaToken('');
    setCaptchaEpoch((value) => value + 1);
  }, []);

  const joinRoom = useCallback(async () => {
    const normalizedCode = normalizePodcastSyncRoomCode(entryOpen ? (entryRoomCode ?? roomCodeInput) : roomCodeInput);
    if (!normalizedCode) {
      setError(lang === 'zh' ? '请输入 6 位房间 ID。' : 'Enter the 6-character room ID.');
      return;
    }
    if (!joinIdentityReady) {
      setError(lang === 'zh' ? '请先完成安全验证。' : 'Complete the security check first.');
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;
    const joiningFromEntry = entryOpen;
    if (joiningFromEntry) {
      joinedFromEntryRef.current = true;
      entryTransitionRef.current = true;
    }
    setBusy(true);
    setError('');
    try {
      const identity = await ensurePodcastSyncIdentity(lang, captchaToken);
      setHasRoomIdentitySession(true);
      const result = await client.rpc<RoomRpcResult>('rhythmcoach_join_sync_room', { p_room_code: normalizedCode });
      if (result.error || !result.data) throw new Error(result.error?.message ?? 'join_failed');
      await loadRoom(result.data.room_id, identity);
      setRoomCodeInput('');
      resetGuestVerification();
      if (joiningFromEntry) {
        onEntryJoined();
      } else {
        setPanelOpen(true);
      }
    } catch (requestError) {
      if (joiningFromEntry) {
        joinedFromEntryRef.current = false;
        entryTransitionRef.current = false;
      }
      const message = requestError instanceof Error ? requestError.message : '';
      if (needsGuestVerification) resetGuestVerification();
      setError(roomErrorMessage(message, lang));
    } finally {
      setBusy(false);
    }
  }, [captchaToken, entryOpen, entryRoomCode, joinIdentityReady, lang, loadRoom, needsGuestVerification, onEntryJoined, resetGuestVerification, roomCodeInput]);

  const leaveRoom = useCallback(async (exitToEditor = joinedFromEntryRef.current) => {
    const activeRoom = roomRef.current;
    const identity = roomUserRef.current;
    if (!activeRoom || !identity) return;
    const client = getSupabaseClient();
    if (!client) return;
    setBusy(true);
    setError('');
    try {
      const host = activeRoom.host_user_id === identity.id;
      if (host) await broadcast('room-closed', { sender_id: identity.id });
      else await broadcast('room-state-changed', { sender_id: identity.id });
      await client.rpc<void>('rhythmcoach_leave_sync_room', { p_room_id: activeRoom.id });
      joinedFromEntryRef.current = false;
      entryTransitionRef.current = false;
      await clearRoom();
      setPanelOpen(false);
      if (exitToEditor) onRoomExit();
    } catch (requestError) {
      setError(roomErrorMessage(requestError instanceof Error ? requestError.message : '', lang));
    } finally {
      setBusy(false);
    }
  }, [broadcast, clearRoom, lang, onRoomExit]);

  useEffect(() => {
    if (prompterActive) {
      entryTransitionRef.current = false;
      return;
    }
    if (!room || entryTransitionRef.current) return;
    void leaveRoom(false);
  }, [leaveRoom, prompterActive, room]);

  const setScrollPermission = useCallback(async (member: MemberRecord, nextValue: boolean) => {
    if (!room || !isHost || !roomUser) return;
    const client = getSupabaseClient();
    if (!client) return;
    setBusy(true);
    setError('');
    try {
      const result = await client.rpc<void>('rhythmcoach_set_sync_scroll_permission', {
        p_room_id: room.id,
        p_member_user_id: member.user_id,
        p_can_scroll: nextValue
      });
      if (result.error) throw new Error(result.error.message);
      await refreshMembers(room.id);
      await broadcast('room-state-changed', { sender_id: roomUser.id });
    } catch (requestError) {
      setError(roomErrorMessage(requestError instanceof Error ? requestError.message : '', lang));
    } finally {
      setBusy(false);
    }
  }, [broadcast, isHost, lang, refreshMembers, room, roomUser]);

  useEffect(() => {
    if (!room || !prompterActive) return;
    const client = getSupabaseClient();
    if (!client) return;
    const interval = window.setInterval(() => { void client.rpc<void>('rhythmcoach_touch_sync_room', { p_room_id: room.id }); }, 60_000);
    return () => window.clearInterval(interval);
  }, [prompterActive, room]);

  useEffect(() => {
    if (!room || !roomUser || !prompterActive) return;
    const element = getPrompterScroll();
    if (!element) return;
    const markLocalIntent = () => { localIntentUntilRef.current = performance.now() + LOCAL_INTENT_MS; };
    const handleKey = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(event.code)) markLocalIntent();
    };
    const emitProgress = (progress: number) => {
      const channel = channelRef.current;
      if (!channel) return;
      seqRef.current += 1;
      lastBroadcastAtRef.current = performance.now();
      void channel.send({ type: 'broadcast', event: 'scroll', payload: { sender_id: roomUser.id, seq: seqRef.current, progress } });
    };
    const queueProgress = (progress: number) => {
      pendingProgressRef.current = progress;
      const elapsed = performance.now() - lastBroadcastAtRef.current;
      if (elapsed >= SCROLL_BROADCAST_INTERVAL_MS && broadcastTimerRef.current === null) {
        pendingProgressRef.current = null;
        emitProgress(progress);
        return;
      }
      if (broadcastTimerRef.current !== null) return;
      broadcastTimerRef.current = window.setTimeout(() => {
        broadcastTimerRef.current = null;
        const pending = pendingProgressRef.current;
        pendingProgressRef.current = null;
        if (pending !== null) emitProgress(pending);
      }, Math.max(0, SCROLL_BROADCAST_INTERVAL_MS - elapsed));
    };
    const handleScroll = () => {
      const now = performance.now();
      if (now < applyingRemoteUntilRef.current || now > localIntentUntilRef.current) return;
      const progress = readScrollProgress();
      const activeMember = membersRef.current.find((member) => member.user_id === roomUser.id);
      if (!activeMember?.can_scroll) {
        applyRemoteProgress(sharedProgressRef.current);
        return;
      }
      sharedProgressRef.current = progress;
      queueProgress(progress);
    };
    element.addEventListener('wheel', markLocalIntent, { passive: true });
    element.addEventListener('touchstart', markLocalIntent, { passive: true });
    element.addEventListener('pointerdown', markLocalIntent, { passive: true });
    element.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKey);
    return () => {
      element.removeEventListener('wheel', markLocalIntent);
      element.removeEventListener('touchstart', markLocalIntent);
      element.removeEventListener('pointerdown', markLocalIntent);
      element.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKey);
    };
  }, [applyRemoteProgress, prompterActive, room, roomUser]);

  useEffect(() => () => { void disconnectChannel(); }, [disconnectChannel]);

  const copyRoomCode = async () => {
    if (!room || !navigator.clipboard) return;
    await navigator.clipboard.writeText(room.room_code).catch(() => undefined);
    setRoomCodeCopied(true);
    window.setTimeout(() => setRoomCodeCopied(false), 1400);
  };

  const inviteMembers = async () => {
    if (!room || remainingSlots === 0) return;
    const inviteUrl = buildInviteUrl(room.room_code);
    const inviteTitle = lang === 'zh' ? '加入我的 RhythmCoach 同步播客' : 'Join my RhythmCoach podcast sync';
    const inviteText = lang === 'zh' ? `一起排练这期播客。房间 ID：${room.room_code}` : `Rehearse this podcast with me. Room ID: ${room.room_code}`;
    try {
      const useNativeShare = typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;
      if (useNativeShare) {
        await navigator.share({ title: inviteTitle, text: inviteText, url: inviteUrl });
        return;
      }
      if (!navigator.clipboard) throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1600);
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setError(lang === 'zh' ? '邀请链接复制失败，请重试。' : 'Could not share the invite link. Please try again.');
    }
  };

  const triggerLabel = room
    ? (lang === 'zh' ? `同步播客，${members.length}/${MAX_MEMBERS} 人` : `Podcast sync, ${members.length}/${MAX_MEMBERS} people`)
    : (lang === 'zh' ? '同步播客' : 'Podcast sync');

  const guestVerification = needsGuestVerification ? (
    <div className="podcast-sync-security-check">
      <div className="podcast-sync-security-copy">
        <ShieldCheck size={16} />
        <span>{lang === 'zh' ? '无需登录 · 首次加入完成一次安全验证' : 'No sign-in · one security check on first join'}</span>
      </div>
      <TurnstileWidget
        key={captchaEpoch}
        siteKey={membershipConfig.turnstileSiteKey}
        onToken={(token) => {
          setCaptchaToken(token);
          if (token) {
            setCaptchaUnavailable('');
            setError((current) => current.includes('安全验证') || current.includes('security check') ? '' : current);
          }
        }}
        onUnavailable={(message) => {
          setCaptchaToken('');
          setCaptchaUnavailable(message);
        }}
      />
      {captchaUnavailable && <span className="podcast-sync-security-error">{lang === 'zh' ? '安全验证暂时不可用，请稍后重试。' : 'Security verification is temporarily unavailable.'}</span>}
    </div>
  ) : null;

  const panel = (
    <AnimatePresence>
      {panelVisible && (
        <>
          <motion.div className="podcast-sync-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} onClick={closePanel} aria-hidden="true" />
          <motion.aside
            id={PANEL_ID}
            ref={panelRef}
            role="dialog"
            aria-labelledby={PANEL_TITLE_ID}
            className={`podcast-sync-panel ${isExternalEntry ? 'is-entry' : ''}`}
            initial={{ y: 16, scale: 0.99 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 12, scale: 0.99 }}
            transition={{ duration: 0.16 }}
          >
            <div className="podcast-sync-header">
              <div>
                <strong id={PANEL_TITLE_ID}>{isExternalEntry
                  ? entrySource === 'invite'
                    ? (lang === 'zh' ? '同步播客邀请' : 'Podcast sync invite')
                    : (lang === 'zh' ? '加入同步房间' : 'Join a sync room')
                  : (lang === 'zh' ? '同步播客' : 'Podcast sync')}</strong>
                <span aria-live="polite">{room
                  ? connectionLabel
                  : isExternalEntry
                    ? entrySource === 'invite'
                      ? (lang === 'zh' ? '房主邀请你一起排练' : 'The host invited you to rehearse')
                      : (lang === 'zh' ? '输入房间 ID，无需登录账号' : 'Enter a room ID — no account required')
                    : (lang === 'zh' ? '最多 4 人，同看同一份稿件' : 'Up to 4 people on the same script')}</span>
              </div>
              <button type="button" className="podcast-sync-icon" onClick={closePanel} aria-label={lang === 'zh' ? '关闭' : 'Close'}><X size={18} /></button>
            </div>

            {!room ? (
              isExternalEntry ? (
                <div className="podcast-sync-invite-entry">
                  <div className="podcast-sync-invite-mark"><UsersRound size={24} /></div>
                  <strong>{entrySource === 'invite'
                    ? (lang === 'zh' ? '一起排练这期播客' : 'Rehearse this podcast together')
                    : (lang === 'zh' ? '加入房主的实时排练' : 'Join the host’s live rehearsal')}</strong>
                  <p>{lang === 'zh'
                    ? '加入后会直接载入房主共享的稿件和实时滚动位置。无需注册或登录。'
                    : 'The host’s shared script and live scroll position load immediately. No sign-up or sign-in required.'}</p>
                  {entrySource === 'invite' && entryRoomCode ? (
                    <div className="podcast-sync-invite-code"><span>{lang === 'zh' ? '房间 ID' : 'Room ID'}</span><strong>{entryRoomCode}</strong></div>
                  ) : (
                    <div className="podcast-sync-join-row podcast-sync-entry-code">
                      <input
                        data-autofocus="true"
                        value={roomCodeInput}
                        onChange={(event) => setRoomCodeInput(event.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, 6))}
                        onKeyDown={(event) => { if (event.key === 'Enter' && joinIdentityReady) void joinRoom(); }}
                        placeholder={lang === 'zh' ? '6 位房间 ID' : '6-character room ID'}
                        autoCapitalize="characters"
                        spellCheck={false}
                        maxLength={6}
                        aria-label={lang === 'zh' ? '房间 ID' : 'Room ID'}
                      />
                    </div>
                  )}
                  {guestVerification}
                  <button type="button" className="podcast-sync-primary" onClick={() => void joinRoom()} disabled={busy || !joinIdentityReady} data-autofocus={entrySource === 'invite' && joinIdentityReady ? 'true' : undefined}>
                    <Link2 size={18} /> {busy ? (lang === 'zh' ? '正在加入…' : 'Joining…') : (lang === 'zh' ? '加入房间' : 'Join room')}
                  </button>
                  <button type="button" className="podcast-sync-secondary" onClick={onEntryDismiss} disabled={busy}>{lang === 'zh' ? '取消' : 'Cancel'}</button>
                </div>
              ) : (
                <div className="podcast-sync-entry">
                  {!accountUser && (
                    <div className="podcast-sync-account-note">
                      <LogIn size={18} />
                      <div>
                        <strong>{lang === 'zh' ? '创建房间需要账号' : 'An account is required to create'}</strong>
                        <span>{lang === 'zh' ? '用于识别房主和管理成员权限；加入房间不需要登录。' : 'This identifies the host and protects room controls. Joining does not require sign-in.'}</span>
                      </div>
                      <button type="button" onClick={openDialog}>{lang === 'zh' ? '登录' : 'Sign in'}</button>
                    </div>
                  )}
                  <button type="button" className="podcast-sync-primary" onClick={() => void createRoom()} disabled={busy}><Link2 size={18} /> {lang === 'zh' ? '创建房间' : 'Create room'}</button>
                  <div className="podcast-sync-divider"><span>{lang === 'zh' ? '加入已有房间 · 无需登录' : 'Join an existing room · no account required'}</span></div>
                  <div className="podcast-sync-join-row">
                    <input
                      value={roomCodeInput}
                      onChange={(event) => setRoomCodeInput(event.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, 6))}
                      onKeyDown={(event) => { if (event.key === 'Enter' && joinIdentityReady) void joinRoom(); }}
                      placeholder={lang === 'zh' ? '房间 ID' : 'Room ID'}
                      autoCapitalize="characters"
                      spellCheck={false}
                      maxLength={6}
                      aria-label={lang === 'zh' ? '房间 ID' : 'Room ID'}
                    />
                    <button type="button" onClick={() => void joinRoom()} disabled={busy || !joinIdentityReady}>{lang === 'zh' ? '加入' : 'Join'}</button>
                  </div>
                  {guestVerification}
                </div>
              )
            ) : (
              <div className="podcast-sync-room">
                {isHost && (
                  <button type="button" className={`podcast-sync-invite-button ${remainingSlots === 0 ? 'is-full' : ''}`} onClick={() => void inviteMembers()} disabled={busy || remainingSlots === 0}>
                    <span>
                      <strong>{remainingSlots === 0
                        ? (lang === 'zh' ? '房间已满' : 'Room is full')
                        : inviteCopied
                          ? (lang === 'zh' ? '邀请链接已复制' : 'Invite link copied')
                          : (lang === 'zh' ? '邀请成员' : 'Invite people')}</strong>
                      <small>{remainingSlots === 0 ? `${MAX_MEMBERS}/${MAX_MEMBERS}` : (lang === 'zh' ? `还可加入 ${remainingSlots} 人` : `${remainingSlots} spots left`)}</small>
                    </span>
                    {inviteCopied ? <Check size={18} /> : <Share2 size={18} />}
                  </button>
                )}
                <div className="podcast-sync-room-id">
                  <span>{lang === 'zh' ? '房间 ID' : 'Room ID'}</span>
                  <button type="button" onClick={() => void copyRoomCode()} aria-label={lang === 'zh' ? `复制房间 ID ${room.room_code}` : `Copy room ID ${room.room_code}`}>
                    <strong>{room.room_code}</strong>{roomCodeCopied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="podcast-sync-members-heading"><strong>{lang === 'zh' ? '成员' : 'People'}</strong><span>{members.length}/{MAX_MEMBERS}</span></div>
                <div className="podcast-sync-members">
                  {members.map((member) => {
                    const memberIsHost = member.user_id === room.host_user_id;
                    const memberIsSelf = member.user_id === roomUser?.id;
                    const online = onlineUserIds.has(member.user_id);
                    return (
                      <div className="podcast-sync-member" key={member.user_id}>
                        <div className="podcast-sync-avatar">
                          {member.avatar_url ? <img src={member.avatar_url} alt="" /> : member.display_name.slice(0, 1).toUpperCase()}
                          <i className={online ? 'online' : ''} aria-hidden="true" />
                        </div>
                        <div className="podcast-sync-member-name">
                          <strong>{member.display_name}{memberIsSelf ? (lang === 'zh' ? ' · 你' : ' · You') : ''}</strong>
                          <span>{memberIsHost ? (lang === 'zh' ? '房主' : 'Host') : (lang === 'zh' ? '成员' : 'Member')}</span>
                        </div>
                        {isHost && !memberIsHost ? (
                          <button type="button" className={`podcast-sync-switch ${member.can_scroll ? 'on' : ''}`} onClick={() => void setScrollPermission(member, !member.can_scroll)} disabled={busy} aria-pressed={member.can_scroll} aria-label={member.can_scroll ? (lang === 'zh' ? '暂停滚动权限' : 'Pause scroll access') : (lang === 'zh' ? '开启滚动权限' : 'Enable scroll access')}><span /></button>
                        ) : (
                          <span className={`podcast-sync-access ${member.can_scroll ? 'allowed' : ''}`}>{member.can_scroll ? (lang === 'zh' ? '可滚动' : 'Scroll') : (lang === 'zh' ? '跟随' : 'Follow')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="podcast-sync-note">
                  {isHost
                    ? (lang === 'zh' ? '第 2 位成员默认可滚动；第 3、4 位默认仅跟随。你可以随时调整。' : 'Person 2 can scroll by default; people 3–4 follow only. You can change access anytime.')
                    : canScroll
                      ? (lang === 'zh' ? '你可以滚动正文；开始滚动时，其他成员会跟随。' : 'You can scroll; when you move the script, others follow.')
                      : (lang === 'zh' ? '当前由房主暂停了你的滚动权限，你会跟随共享进度。' : 'Your scroll access is paused by the host; you follow the shared position.')}
                </div>
                <button type="button" className="podcast-sync-leave" onClick={() => void leaveRoom()} disabled={busy}><LogOut size={16} /> {isHost ? (lang === 'zh' ? '结束房间' : 'End room') : (lang === 'zh' ? '离开房间' : 'Leave room')}</button>
              </div>
            )}
            {error && <div className="podcast-sync-error" role="status">{error}</div>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {prompterActive && (
        <PrompterTopbarPortal>
          <button
            ref={triggerRef}
            type="button"
            className={`podcast-sync-trigger ${room ? 'is-live' : ''}`}
            onClick={() => setPanelOpen((current) => !current)}
            aria-expanded={panelVisible}
            aria-controls={PANEL_ID}
            aria-label={triggerLabel}
            title={triggerLabel}
            data-member-count={room ? members.length : undefined}
          >
            <UsersRound size={17} />
            <span className="podcast-sync-trigger-label">{room ? `${members.length}/${MAX_MEMBERS}` : (lang === 'zh' ? '同步' : 'Sync')}</span>
          </button>
        </PrompterTopbarPortal>
      )}
      {createPortal(panel, document.body)}
    </>
  );
}
