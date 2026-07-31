import { create } from 'zustand';
import { Recording } from './types';
import localforage from 'localforage';

export type AudioProfile = 'raw' | 'podcast' | 'broadcast';

interface AppState {
  mode: 'editor' | 'teleprompter';
  activeScript: string;
  targetCpm: number;
  globalLang: 'zh' | 'en';
  prompterMode: 'target' | 'free';
  audioProfile: AudioProfile;
  recordings: Recording[];
  isRecordingsLoaded: boolean;
  
  // Actions
  setMode: (mode: 'editor' | 'teleprompter') => void;
  setActiveScript: (script: string) => void;
  setTargetCpm: (cpm: number) => void;
  setGlobalLang: (lang: 'zh' | 'en') => void;
  setPrompterMode: (mode: 'target' | 'free') => void;
  setAudioProfile: (profile: AudioProfile) => void;
  setRecordings: (updater: Recording[] | ((prev: Recording[]) => Recording[])) => void;
  loadRecordings: () => Promise<void>;
  addRecording: (rec: Recording) => void;
  deleteRecording: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'editor',
  activeScript: '',
  targetCpm: 220,
  globalLang: 'zh',
  prompterMode: 'target',
  audioProfile: 'raw',
  recordings: [],
  isRecordingsLoaded: false,

  setMode: (mode) => set({ mode }),
  setActiveScript: (script) => set({ activeScript: script }),
  setTargetCpm: (cpm) => set({ targetCpm: cpm }),
  setGlobalLang: (lang) => set({ globalLang: lang }),
  setPrompterMode: (mode) => set({ prompterMode: mode }),
  setAudioProfile: (profile) => set({ audioProfile: profile }),
  
  setRecordings: (updater) => {
    set((state) => {
      const nextRecordings = typeof updater === 'function' ? updater(state.recordings) : updater;
      if (state.isRecordingsLoaded) {
        localforage.setItem('rhythmcoach_recordings', nextRecordings).catch(console.error);
      }
      return { recordings: nextRecordings };
    });
  },

  addRecording: (rec) => {
    set((state) => {
      const nextRecordings = [...state.recordings, rec];
      if (state.isRecordingsLoaded) {
        localforage.setItem('rhythmcoach_recordings', nextRecordings).catch(console.error);
      }
      return { recordings: nextRecordings };
    });
  },

  deleteRecording: (id) => {
    set((state) => {
      const rec = state.recordings.find(r => r.id === id);
      if (rec?.url) URL.revokeObjectURL(rec.url);
      
      const nextRecordings = state.recordings.filter(r => r.id !== id);
      if (state.isRecordingsLoaded) {
        localforage.setItem('rhythmcoach_recordings', nextRecordings).catch(console.error);
      }
      return { recordings: nextRecordings };
    });
  },

  loadRecordings: async () => {
    try {
      const savedRecs = await localforage.getItem<Recording[]>('rhythmcoach_recordings');
      if (savedRecs && Array.isArray(savedRecs)) {
        const withUrls = savedRecs.map(rec => {
          if (rec.blob) {
            rec.url = URL.createObjectURL(rec.blob);
          }
          return rec;
        });
        set({ recordings: withUrls, isRecordingsLoaded: true });
      } else {
        set({ isRecordingsLoaded: true });
      }
    } catch (err) {
      console.error('Failed to load recordings:', err);
      set({ isRecordingsLoaded: true });
    }
  }
}));
