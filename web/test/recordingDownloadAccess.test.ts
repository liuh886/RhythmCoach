import {
  canDownloadRecording,
  RECORDING_DOWNLOAD_ENTITLEMENT
} from '../src/domain/recordingDownloadAccess.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

expectEqual(RECORDING_DOWNLOAD_ENTITLEMENT, 'rhythmcoach.recording_download', 'Entitlement code');
expectEqual(canDownloadRecording({ enforceMembership: false, hasEntitlement: false }), true, 'Rollout keeps free downloads');
expectEqual(canDownloadRecording({ enforceMembership: false, hasEntitlement: true }), true, 'Member download before enforcement');
expectEqual(canDownloadRecording({ enforceMembership: true, hasEntitlement: false }), false, 'Free user after enforcement');
expectEqual(canDownloadRecording({ enforceMembership: true, hasEntitlement: true }), true, 'Member after enforcement');

console.log('Recording download membership access checks passed');
