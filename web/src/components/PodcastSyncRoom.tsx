import './PodcastSyncRoom.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Link2, LogOut, RadioTower, Share2, UsersRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { hashForPodcastSyncInvite, normalizePodcastSyncRoomCode } from '../domain/productSurface';
import { useMembership } from '../membership/MembershipProvider';
import { getSupabaseClient, type RealtimeChannelLike } from '../supabase/client';
import type { Language } from '../types';

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

interface PodcastSyncRoomProps {
  title: string;
  script: string;
  deliveryMarkup: string;
  lang: Language;
  inviteRoomCode?: string | null;
  onInviteDismiss?: () => void;
  onInviteJoined?: () => void;
  onRoomContentChange: (content: PodcastSyncContent | null) => void;
}

interface RoomRpcResult {
  room_id: string;
  room_code: string;
}

const MAX_MEMBERS = 4;
const SCROLL_BROADCAST_INTERVAL_MS = 80;
const REMOTE_SCROLL_GUARD_MS = 160;
const LOCAL_INTENT_MS = 700;

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function roomErrorMessage(message: string, lang: Language): string {
  if (message.includes('room_full')) return lang === 'zh' ? '房间已满，最多 4 人。' : 'This room is full (4 people maximum).';
  if (message.includes('room_not_found')) return lang === 'zh' ? '没有找到这个房间，或房间已经过期。' : 'Room not found or expired.';
  if (message.includes('authentication_required')) return lang === 'zh' ? '请先登录后再使用同步播客。' : 'Sign in to use podcast sync.';
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
  inviteRoomCode = null,
  onInviteDismiss,
  onInviteJoined,
  onRoomContentChange
}: PodcastSyncRoomProps) {
  const { user, profile, openDialog } = useMembership();
  const [panelOpen, setPanelOpen] = useState(Boolean(inviteRoomCode));
  const [roomCodeInput, setRoomCodeInput] = useState(inviteRoomCode ?? '');
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const channelRef = useRef<RealtimeChannelLike | null>(null);
  const applyingRemoteUntilRef = useRef(0);
  const localIntentUntilRef = useRef(0);
  const sharedProgressRef = useRef(0);
  const lastBroadcastAtRef = useRef(0);
  const pendingProgressRef = useRef<number | null>(null);
  const broadcastTimerRef = useRef<number | null>(null);
  const seqRef = useRef(0);
  const roomRef = useRef<RoomRecord | null>(null);
  const membersRef = useRef<MemberRecord[]>([]);
  const joinedFromInviteRef = useRef(Boolean(inviteRoomCode));

  roomRef.current = room;
  membersRef.current = members;

  const currentMember = useMemo(
    () => members.find((member) => member.user_id === user?.id) ?? null,
    [members, user?.id]
  );
  const isHost = Boolean(room && user && room.host_user_id === user.id);
  const canScroll = Boolean(currentMember?.can_scroll);
  const onlineCount = onlineUserIds.size || (room ? 1 : 0);
  const remainingSlots = Math.max(0, MAX_MEMBERS - members.length);
  const isInviteEntry = Boolean(inviteRoomCode && !room);

  useEffect(() => {
    if (!inviteRoomCode || room) return;
    const normalized = normalizePodcastSyncRoomCode(inviteRoomCode);
    if (!normalized) return;
    joinedFromInviteRef.current = true;
    setRoomCodeInput(normalized);
    setPanelOpen(true);
    setError('');
  }, [inviteRoomCode, room]);

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
    const result = await client
      .from<MemberRecord>('rhythmcoach_sync_members')
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
    await disconnectChannel();
    setRoom(null);
    setMembers([]);
    onRoomContentChange(null);
    if (message) setError(message);
  }, [disconnectChannel, onRoomContentChange]);

  const broadcast = useCallback(async (event: string, payload: Record<string, unknown>) => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({ type: 'broadcast', event, payload }).catch(() => undefined);
  }, []);

  const connectRoom = useCallback(async (nextRoom: RoomRecord) => {
    const client = getSupabaseClient();
    if (!client || !user) return;
    await disconnectChannel();

    setRoom(nextRoom);
    setConnectionState('connecting');
    setError('');
    onRoomContentChange({
      title: nextRoom.title,
      script: nextRoom.script,
      deliveryMarkup: nextRoom.delivery_markup ?? nextRoom.script
    });
    await refreshMembers(nextRoom.id);

    const channel = client.channel(`rhythmcoach:podcast:${nextRoom.id}`, {
      config: {
        private: true,
        presence: { key: user.id }
      }
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'scroll' }, ({ payload }) => {
        if (!payload || payload.sender_id === user.id) return;
        const progress = Number(payload.progress);
        if (!Number.isFinite(progress)) return;
        applyRemoteProgress(progress);
      })
      .on('broadcast', { event: 'sync-request' }, ({ payload }) => {
        if (nextRoom.host_user_id !== user.id || payload?.sender_id === user.id) return;
        void channel.send({
          type: 'broadcast',
          event: 'snapshot',
          payload: { sender_id: user.id, progress: readScrollProgress() }
        });
      })
      .on('broadcast', { event: 'snapshot' }, ({ payload }) => {
        if (!payload || payload.sender_id === user.id) return;
        const progress = Number(payload.progress);
        if (Number.isFinite(progress)) applyRemoteProgress(progress);
      })
      .on('broadcast', { event: 'room-state-changed' }, () => {
        void refreshMembers(nextRoom.id);
      })
      .on('broadcast', { event: 'room-closed' }, ({ payload }) => {
        if (payload?.sender_id === user.id) return;
        void clearRoom(lang === 'zh' ? '房主已结束同步房间。' : 'The host ended this sync room.');
      })
      .on('presence', { event: 'sync' }, () => {
        const nextOnline = new Set<string>();
        Object.values(channel.presenceState()).flat().forEach((presence) => {
          const userId = presence.user_id;
          if (typeof userId === 'string') nextOnline.add(userId);
        });
        setOnlineUserIds(nextOnline);
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        setConnectionState('connected');
        sharedProgressRef.current = readScrollProgress();
        void channel.track({
          user_id: user.id,
          display_name: profile?.display_name ?? user.email?.split('@')[0] ?? 'Member'
        });
        void client.rpc<void>('rhythmcoach_touch_sync_room', { p_room_id: nextRoom.id });
        void channel.send({
          type: 'broadcast',
          event: 'sync-request',
          payload: { sender_id: user.id }
        });
        void channel.send({
          type: 'broadcast',
          event: 'room-state-changed',
          payload: { sender_id: user.id }
        });
      });
  }, [applyRemoteProgress, clearRoom, disconnectChannel, lang, onRoomContentChange, profile?.display_name, refreshMembers, user]);

  const loadAndConnectRoom = useCallback(async (roomId: string) => {
    const client = getSupabaseClient();
    if (!client) return;
    const result = await client
      .from<RoomRecord>('rhythmcoach_sync_rooms')
      .select('id,room_code,host_user_id,title,script,delivery_markup,expires_at')
      .eq('id', roomId)
      .single();
    if (result.error || !result.data) throw new Error(result.error?.message ?? 'room_not_found');
    await connectRoom(result.data);
  }, [connectRoom]);

  const createRoom = useCallback(async () => {
    if (!user) {
      openDialog();
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;
    setBusy(true);
    setError('');
    joinedFromInviteRef.current = false;
    try {
      const result = await client.rpc<RoomRpcResult>('rhythmcoach_create_sync_room', {
        p_title: title.trim() || (lang === 'zh' ? '同步播客' : 'Podcast sync'),
        p_script: script,
        p_delivery_markup: deliveryMarkup || script
      });
      if (result.error || !result.data) throw new Error(result.error?.message ?? 'create_failed');
      await loadAndConnectRoom(result.data.room_id);
      setPanelOpen(true);
    } catch (requestError) {
      setError(roomErrorMessage(requestError instanceof Error ? requestError.message : '', lang));
    } finally {
      setBusy(false);
    }
  }, [deliveryMarkup, lang, loadAndConnectRoom, openDialog, script, title, user]);

  const joinRoom = useCallback(async () => {
    const normalizedCode = normalizePodcastSyncRoomCode(inviteRoomCode ?? roomCodeInput);
    if (!normalizedCode) {
      setError(lang === 'zh' ? '请输入 6 位房间 ID。' : 'Enter the 6-character room ID.');
      return;
    }
    if (!user) {
      openDialog();
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;
    setBusy(true);
    setError('');
    try {
      const result = await client.rpc<RoomRpcResult>('rhythmcoach_join_sync_room', { p_room_code: normalizedCode });
      if (result.error || !result.data) throw new Error(result.error?.message ?? 'join_failed');
      await loadAndConnectRoom(result.data.room_id);
      setRoomCodeInput('');
      setPanelOpen(true);
      if (inviteRoomCode) onInviteJoined?.();
    } catch (requestError) {
      setError(roomErrorMessage(requestError instanceof Error ? requestError.message : '', lang));
    } finally {
      setBusy(false);
    }
  }, [inviteRoomCode, lang, loadAndConnectRoom, onInviteJoined, openDialog, roomCodeInput, user]);

  const leaveRoom = useCallback(async () => {
    if (!room || !user) return;
    const client = getSupabaseClient();
    if (!client) return;
    setBusy(true);
    setError('');
    try {
      if (isHost) {
        await broadcast('room-closed', { sender_id: user.id });
      } else {
        await broadcast('room-state-changed', { sender_id: user.id });
      }
      await client.rpc<void>('rhythmcoach_leave_sync_room', { p_room_id: room.id });
      await clearRoom();
      if (joinedFromInviteRef.current) {
        joinedFromInviteRef.current = false;
        onInviteDismiss?.();
      }
    } catch (requestError) {
      setError(roomErrorMessage(requestError instanceof Error ? requestError.message : '', lang));
    } finally {
      setBusy(false);
    }
  }, [broadcast, clearRoom, isHost, lang, onInviteDismiss, room, user]);

  const setScrollPermission = useCallback(async (member: MemberRecord, nextValue: boolean) => {
    if (!room || !isHost) return;
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
      await broadcast('room-state-changed', { sender_id: user?.id ?? '' });
    } catch (requestError) {
      setError(roomErrorMessage(requestError instanceof Error ? requestError.message : '', lang));
    } finally {
      setBusy(false);
    }
  }, [broadcast, isHost, lang, refreshMembers, room, user?.id]);

  useEffect(() => {
    if (!room) return;
    const client = getSupabaseClient();
    if (!client) return;
    const interval = window.setInterval(() => {
      void client.rpc<void>('rhythmcoach_touch_sync_room', { p_room_id: room.id });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [room]);

  useEffect(() => {
    if (!room || !user) return;
    const element = getPrompterScroll();
    if (!element) return;

    const markLocalIntent = () => {
      localIntentUntilRef.current = performance.now() + LOCAL_INTENT_MS;
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.code === 'ArrowDown' || event.code === 'ArrowUp' || event.code === 'PageDown' || event.code === 'PageUp') {
        markLocalIntent();
      }
    };
    const emitProgress = (progress: number) => {
      const channel = channelRef.current;
      if (!channel) return;
      seqRef.current += 1;
      lastBroadcastAtRef.current = performance.now();
      void channel.send({
        type: 'broadcast',
        event: 'scroll',
        payload: { sender_id: user.id, seq: seqRef.current, progress }
      });
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
      if (now < applyingRemoteUntilRef.current) return;
      if (now > localIntentUntilRef.current) return;
      const progress = readScrollProgress();
      const activeMember = membersRef.current.find((member) => member.user_id === user.id);
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
  }, [applyRemoteProgress, room, user]);

  useEffect(() => () => {
    void disconnectChannel();
  }, [disconnectChannel]);

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
    const inviteText = lang === 'zh'
      ? `一起排练这期播客。房间 ID：${room.room_code}`
      : `Rehearse this podcast with me. Room ID: ${room.room_code}`;

    try {
      const useNativeShare = typeof navigator.share === 'function'
        && window.matchMedia('(pointer: coarse)').matches;
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

  const closePanel = () => {
    if (isInviteEntry) {
      onInviteDismiss?.();
      return;
    }
    setPanelOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`podcast-sync-trigger ${room ? 'is-live' : ''}`}
        onClick={() => setPanelOpen((current) => !current)}
        aria-expanded={panelOpen}
        title={lang === 'zh' ? '同步播客' : 'Podcast sync'}
      >
        <UsersRound size={17} />
        <span>{room ? `${Math.min(MAX_MEMBERS, onlineCount)}/${MAX_MEMBERS}` : (lang === 'zh' ? '同步' : 'Sync')}</span>
      </button>

      <AnimatePresence>
        {panelOpen && (
          <motion.aside
            className={`podcast-sync-panel ${isInviteEntry ? 'is-invite' : ''}`}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.16 }}
          >
            <div className="podcast-sync-header">
              <div>
                <strong>{isInviteEntry
                  ? (lang === 'zh' ? '同步播客邀请' : 'Podcast sync invite')
                  : (lang === 'zh' ? '同步播客' : 'Podcast sync')}</strong>
                <span>{room
                  ? (connectionState === 'connected' ? (lang === 'zh' ? '实时同步中' : 'Live sync') : (lang === 'zh' ? '正在连接' : 'Connecting'))
                  : isInviteEntry
                    ? (lang === 'zh' ? '房主邀请你一起排练' : 'The host invited you to rehearse')
                    : (lang === 'zh' ? '最多 4 人，同看同一份稿件' : 'Up to 4 people on the same script')}</span>
              </div>
              <button type="button" className="podcast-sync-icon" onClick={closePanel} aria-label={lang === 'zh' ? '关闭' : 'Close'}><X size={17} /></button>
            </div>

            {!room ? (
              isInviteEntry ? (
                <div className="podcast-sync-invite-entry">
                  <div className="podcast-sync-invite-mark"><UsersRound size={24} /></div>
                  <strong>{lang === 'zh' ? '一起排练这期播客' : 'Rehearse this podcast together'}</strong>
                  <p>{lang === 'zh'
                    ? '加入后你会直接看到房主共享的稿件和实时滚动位置。'
                    : 'Join to see the host’s shared script and live scroll position.'}</p>
                  <div className="podcast-sync-invite-code">
                    <span>{lang === 'zh' ? '房间 ID' : 'Room ID'}</span>
                    <strong>{inviteRoomCode}</strong>
                  </div>
                  <button type="button" className="podcast-sync-primary" onClick={() => void joinRoom()} disabled={busy}>
                    <Link2 size={18} /> {user
                      ? (lang === 'zh' ? '加入房间' : 'Join room')
                      : (lang === 'zh' ? '登录后加入' : 'Sign in to join')}
                  </button>
                  <button type="button" className="podcast-sync-secondary" onClick={onInviteDismiss} disabled={busy}>
                    {lang === 'zh' ? '暂不加入' : 'Not now'}
                  </button>
                </div>
              ) : (
                <div className="podcast-sync-entry">
                  {!user && (
                    <div className="podcast-sync-signin">
                      <RadioTower size={18} />
                      <div><strong>{lang === 'zh' ? '在线同步需要登录' : 'Sign in for live sync'}</strong><span>{lang === 'zh' ? '本地训练仍然不需要账户。' : 'Local rehearsal still works without an account.'}</span></div>
                      <button type="button" onClick={openDialog}>{lang === 'zh' ? '登录' : 'Sign in'}</button>
                    </div>
                  )}
                  <button type="button" className="podcast-sync-primary" onClick={() => void createRoom()} disabled={busy}>
                    <Link2 size={18} /> {lang === 'zh' ? '创建房间' : 'Create room'}
                  </button>
                  <div className="podcast-sync-divider"><span>{lang === 'zh' ? '或加入已有房间' : 'or join a room'}</span></div>
                  <div className="podcast-sync-join-row">
                    <input
                      value={roomCodeInput}
                      onChange={(event) => setRoomCodeInput(event.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, 6))}
                      onKeyDown={(event) => { if (event.key === 'Enter') void joinRoom(); }}
                      placeholder={lang === 'zh' ? '房间 ID' : 'Room ID'}
                      autoCapitalize="characters"
                      spellCheck={false}
                      maxLength={6}
                    />
                    <button type="button" onClick={() => void joinRoom()} disabled={busy}>{lang === 'zh' ? '加入' : 'Join'}</button>
                  </div>
                </div>
              )
            ) : (
              <div className="podcast-sync-room">
                {isHost && (
                  <button
                    type="button"
                    className={`podcast-sync-invite-button ${remainingSlots === 0 ? 'is-full' : ''}`}
                    onClick={() => void inviteMembers()}
                    disabled={busy || remainingSlots === 0}
                  >
                    <span>
                      <strong>{remainingSlots === 0
                        ? (lang === 'zh' ? '房间已满' : 'Room is full')
                        : inviteCopied
                          ? (lang === 'zh' ? '邀请链接已复制' : 'Invite link copied')
                          : (lang === 'zh' ? '邀请成员' : 'Invite people')}</strong>
                      <small>{remainingSlots === 0
                        ? `${MAX_MEMBERS}/${MAX_MEMBERS}`
                        : (lang === 'zh' ? `还可加入 ${remainingSlots} 人` : `${remainingSlots} spots left`)}</small>
                    </span>
                    {inviteCopied ? <Check size={18} /> : <Share2 size={18} />}
                  </button>
                )}

                <div className="podcast-sync-room-id">
                  <span>{lang === 'zh' ? '房间 ID' : 'Room ID'}</span>
                  <button type="button" onClick={() => void copyRoomCode()}>
                    <strong>{room.room_code}</strong>
                    {roomCodeCopied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                <div className="podcast-sync-members-heading">
                  <strong>{lang === 'zh' ? '成员' : 'People'}</strong>
                  <span>{members.length}/{MAX_MEMBERS}</span>
                </div>
                <div className="podcast-sync-members">
                  {members.map((member) => {
                    const memberIsHost = member.user_id === room.host_user_id;
                    const memberIsSelf = member.user_id === user?.id;
                    const online = onlineUserIds.has(member.user_id);
                    return (
                      <div className="podcast-sync-member" key={member.user_id}>
                        <div className="podcast-sync-avatar">
                          {member.avatar_url ? <img src={member.avatar_url} alt="" /> : member.display_name.slice(0, 1).toUpperCase()}
                          <i className={online ? 'online' : ''} />
                        </div>
                        <div className="podcast-sync-member-name">
                          <strong>{member.display_name}{memberIsSelf ? (lang === 'zh' ? ' · 你' : ' · You') : ''}</strong>
                          <span>{memberIsHost ? (lang === 'zh' ? '房主' : 'Host') : (member.can_scroll ? (lang === 'zh' ? '可滚动' : 'Can scroll') : (lang === 'zh' ? '仅跟随' : 'Follow only'))}</span>
                        </div>
                        {isHost && !memberIsHost ? (
                          <button
                            type="button"
                            className={`podcast-sync-switch ${member.can_scroll ? 'on' : ''}`}
                            onClick={() => void setScrollPermission(member, !member.can_scroll)}
                            disabled={busy}
                            aria-label={member.can_scroll ? (lang === 'zh' ? '暂停滚动权限' : 'Pause scroll access') : (lang === 'zh' ? '开启滚动权限' : 'Enable scroll access')}
                          ><span /></button>
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

                <button type="button" className="podcast-sync-leave" onClick={() => void leaveRoom()} disabled={busy}>
                  <LogOut size={16} /> {isHost ? (lang === 'zh' ? '结束房间' : 'End room') : (lang === 'zh' ? '离开房间' : 'Leave room')}
                </button>
              </div>
            )}

            {error && <div className="podcast-sync-error">{error}</div>}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
