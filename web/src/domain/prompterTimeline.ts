export interface TimeMarker {
  seconds: number;
  label: string;
  progress: number;
  major: boolean;
}

export function formatTimelineTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export function buildTimeMarkers(totalSeconds: number): TimeMarker[] {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return [];

  const roundedTotal = Math.max(1, Math.round(totalSeconds));
  let interval = roundedTotal <= 75 ? 15 : roundedTotal <= 180 ? 30 : roundedTotal <= 480 ? 60 : 120;
  while (roundedTotal / interval > 8) interval *= 2;

  const points = [0];
  for (let seconds = interval; seconds < roundedTotal; seconds += interval) points.push(seconds);
  points.push(roundedTotal);

  return points.map((seconds, index) => ({
    seconds,
    label: formatTimelineTime(seconds),
    progress: seconds / roundedTotal,
    major: index === 0 || index === points.length - 1 || seconds % (interval * 2) === 0
  }));
}
