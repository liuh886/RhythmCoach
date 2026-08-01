import { buildTimeMarkers, formatTimelineTime } from '../src/domain/prompterTimeline.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
}

function expect(condition: boolean, label: string) {
  if (!condition) throw new Error(label);
}

expectEqual(formatTimelineTime(0), '0:00', 'Zero time');
expectEqual(formatTimelineTime(75), '1:15', 'Minute formatting');
expectEqual(buildTimeMarkers(0).length, 0, 'No markers for invalid duration');

const oneMinute = buildTimeMarkers(60);
expectEqual(oneMinute.map((marker) => marker.label).join(','), '0:00,0:15,0:30,0:45,1:00', 'One-minute markers');
expectEqual(oneMinute[oneMinute.length - 1]?.progress, 1, 'Final marker reaches the end');
expect(oneMinute.every((marker) => marker.progress >= 0 && marker.progress <= 1), 'Marker progress remains bounded');

const longSession = buildTimeMarkers(900);
expect(longSession.length <= 10, 'Long sessions keep the ruler visually restrained');
expectEqual(longSession[0]?.major, true, 'First marker is major');
expectEqual(longSession[longSession.length - 1]?.major, true, 'Last marker is major');

console.log('prompter timeline tests passed');
