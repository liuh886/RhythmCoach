import { create } from 'zustand';
import localforage from 'localforage';
import type { Language, PracticeSession, PrompterMode, Recording } from './types';

export type AudioProfile = 'raw' | 'podcast' | 'broadcast';

const RECORDINGS_KEY = 'rhythmcoach_recordings_v2';
const LEGACY_RECORDINGS_KEY = 'rhythmcoach_recordings';
const SESSIONS_KEY = 'rhythmcoach_sessions_v1';
const SETTINGS_KEY = 'rhythmcoach_settings_v1';
const WORKSPACE_KEY = 'rhythmcoach_workspace_v1';
const MAX_SESSIONS = 100;

interface PersistedSettings {
  globalLang: Language;
  targetPace: number;
  prompterMode: PrompterMode;
  audioProfile: AudioProfile;
}

interface PersistedWorkspace {
  activeTitle: string;
  activeScript: string;
  activeTip: string;
}

interface AppState {
  mode: 'editor' | 'teleprompter';
  activeTitle: string;
  activeScript: string;
  activeTip: string;
  targetPace: number;
  globalLang: Language;
  prompterMode: PrompterMode;
  audioProfile: AudioProfile;
  recordings: Recording[];
  sessions: PracticeSession[];
  isPersistedDataLoaded: boolean;

  setMode: (mode: 'editor' | 'teleprompter') => void;
  setActiveTitle: (title: string) => void;
  setActiveScript: (script: string) => void;
  setActiveTip: (tip: string) => void;
  setTargetPace: (pace: number) => void;
  setGlobalLang: (lang: Language) => void;
  setPrompterMode: (mode: PrompterMode) => void;
  setAudioProfile: (profile: AudioProfile) => void;
  setRecordings: (updater: Recording[] | ((prev: Recording[]) => Recording[])) => void;
  addRecording: (recording: Recording) => void;
  deleteRecording: (id: string) => void;
  addSession: (session: PracticeSession) => void;
  deleteSession: (id: string) => void;
  clearSessions: () => void;
  loadPersistedData: () => Promise<void>;
}

function withoutObjectUrls(recordings: Recording[]): Recording[] {
  return recordings.map(({ url: _url, ...recording }) => ({ ...recording, url: '' }));
}

async function persistRecordings(recordings: Recording[]) {
  await localforage.setItem(RECORDINGS_KEY, withoutObjectUrls(recordings));
}

async function persistSettings(settings: PersistedSettings) {
  await localforage.setItem(SETTINGS_KEY, settings);
}

async function persistWorkspace(workspace: PersistedWorkspace) {
  await localforage.setItem(WORKSPACE_KEY, workspace);
}

function saveCurrentWorkspace(state: AppState) {
  if (!state.isPersistedDataLoaded) return;
  void persistWorkspace({
    activeTitle: state.activeTitle,
    activeScript: state.activeScript,
    activeTip: state.activeTip
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'editor',
  activeTitle: '',
  activeScript: '',
  activeTip: '',
  targetPace: 220,
  globalLang: 'zh',
  prompterMode: 'timed',
  audioProfile: 'raw',
  recordings: [],
  sessions: [],
  isPersistedDataLoaded: false,

  setMode: (mode) => set({ mode }),
  setActiveTitle: (activeTitle) => {
    set({ activeTitle });
    saveCurrentWorkspace(get());
  },
  setActiveScript: (activeScript) => {
    set({ activeScript });
    saveCurrentWorkspace(get());
  },
  setActiveTip: (activeTip) => {
    set({ activeTip });
    saveCurrentWorkspace(get());
  },
  setTargetPace: (targetPace) => {
    set({ targetPace });
    const state = get();
    void persistSettings({
      globalLang: state.globalLang,
      targetPace,
      prompterMode: state.prompterMode,
      audioProfile: state.audioProfile
    });
  },
  setGlobalLang: (globalLang) => {
    set({ globalLang });
    const state = get();
    void persistSettings({
      globalLang,
      targetPace: state.targetPace,
      prompterMode: state.prompterMode,
      audioProfile: state.audioProfile
    });
  },
  setPrompterMode: (prompterMode) => {
    set({ prompterMode });
    const state = get();
    void persistSettings({
      globalLang: state.globalLang,
      targetPace: state.targetPace,
      prompterMode,
      audioProfile: state.audioProfile
    });
  },
  setAudioProfile: (audioProfile) => {
    set({ audioProfile });
    const state = get();
    void persistSettings({
      globalLang: state.globalLang,
      targetPace: state.targetPace,
      prompterMode: state.prompterMode,
      audioProfile
    });
  },

  setRecordings: (updater) => {
    set((state) => {
      const recordings = typeof updater === 'function' ? updater(state.recordings) : updater;
      if (state.isPersistedDataLoaded) void persistRecordings(recordings);
      return { recordings };
    });
  },
  addRecording: (recording) => {
    set((state) => {
      const recordings = [recording, ...state.recordings];
      if (state.isPersistedDataLoaded) void persistRecordings(recordings);
      return { recordings };
    });
  },
  deleteRecording: (id) => {
    set((state) => {
      const removed = state.recordings.find((recording) => recording.id === id);
      if (removed?.url) URL.revokeObjectURL(removed.url);
      const recordings = state.recordings.filter((recording) => recording.id !== id);
      if (state.isPersistedDataLoaded) void persistRecordings(recordings);
      return { recordings };
    });
  },

  addSession: (session) => {
    set((state) => {
      const sessions = [session, ...state.sessions.filter((item) => item.id !== session.id)].slice(0, MAX_SESSIONS);
      if (state.isPersistedDataLoaded) void localforage.setItem(SESSIONS_KEY, sessions);
      return { sessions };
    });
  },
  deleteSession: (id) => {
    set((state) => {
      const sessions = state.sessions.filter((session) => session.id !== id);
      if (state.isPersistedDataLoaded) void localforage.setItem(SESSIONS_KEY, sessions);
      return { sessions };
    });
  },
  clearSessions: () => {
    set({ sessions: [] });
    if (get().isPersistedDataLoaded) void localforage.setItem(SESSIONS_KEY, []);
  },

  loadPersistedData: async () => {
    if (get().isPersistedDataLoaded) return;
    try {
      const [savedRecordings, legacyRecordings, savedSessions, savedSettings, savedWorkspace] = await Promise.all([
        localforage.getItem<Recording[]>(RECORDINGS_KEY),
        localforage.getItem<Recording[]>(LEGACY_RECORDINGS_KEY),
        localforage.getItem<PracticeSession[]>(SESSIONS_KEY),
        localforage.getItem<PersistedSettings>(SETTINGS_KEY),
        localforage.getItem<PersistedWorkspace>(WORKSPACE_KEY)
      ]);

      const sourceRecordings = Array.isArray(savedRecordings)
        ? savedRecordings
        : Array.isArray(legacyRecordings)
          ? legacyRecordings
          : [];
      const recordings = sourceRecordings.map((recording) => ({
        ...recording,
        createdAt: recording.createdAt || Date.now(),
        url: recording.blob ? URL.createObjectURL(recording.blob) : ''
      }));
      const sessions = Array.isArray(savedSessions) ? savedSessions.slice(0, MAX_SESSIONS) : [];

      set({
        recordings,
        sessions,
        activeTitle: savedWorkspace?.activeTitle ?? '',
        activeScript: savedWorkspace?.activeScript ?? '',
        activeTip: savedWorkspace?.activeTip ?? '',
        globalLang: savedSettings?.globalLang ?? 'zh',
        targetPace: savedSettings?.targetPace ?? 220,
        prompterMode: savedSettings?.prompterMode ?? 'timed',
        audioProfile: savedSettings?.audioProfile ?? 'raw',
        isPersistedDataLoaded: true
      });

      if (!Array.isArray(savedRecordings) && recordings.length > 0) {
        await persistRecordings(recordings);
      }
    } catch (error) {
      console.error('Failed to load persisted RhythmCoach data:', error);
      set({ isPersistedDataLoaded: true });
    }
  }
}));
