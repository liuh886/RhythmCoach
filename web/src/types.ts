export type Language = 'zh' | 'en';
export type PrompterMode = 'timed' | 'follow' | 'free';
export type SessionStatus =
  | 'idle'
  | 'requesting_permission'
  | 'ready'
  | 'running'
  | 'paused'
  | 'finishing'
  | 'completed'
  | 'error';

export interface Recording {
  id: string;
  url: string;
  name: string;
  durationSec: number;
  blob?: Blob;
  createdAt: number;
  sessionId?: string;
  mimeType?: string;
}

export interface SessionMetrics {
  totalTimeMs: number;
  speakingTimeMs: number;
  silenceTimeMs: number;
  speakingRatio: number;
  longPauseCount: number;
  completionRatio: number;
  completedUnits: number;
  totalUnits: number;
  estimatedPace: number;
  targetPace: number | null;
  targetDelta: number | null;
  paceUnit: 'CPM' | 'WPM';
}

export interface PracticeSession {
  id: string;
  scriptKey: string;
  scriptTitle: string;
  scriptSnapshot: string;
  lang: Language;
  mode: PrompterMode;
  startedAt: number;
  endedAt: number;
  metrics: SessionMetrics;
}

export interface SessionComparison {
  estimatedPaceDelta: number;
  longPauseDelta: number;
  completionDelta: number;
  speakingRatioDelta: number;
}
