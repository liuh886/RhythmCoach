import assert from 'node:assert/strict';
import {
  canDownloadRecording,
  RECORDING_DOWNLOAD_ENTITLEMENT
} from '../src/domain/recordingDownloadAccess.js';

assert.equal(RECORDING_DOWNLOAD_ENTITLEMENT, 'rhythmcoach.recording_download');
assert.equal(canDownloadRecording({ enforceMembership: false, hasEntitlement: false }), true);
assert.equal(canDownloadRecording({ enforceMembership: false, hasEntitlement: true }), true);
assert.equal(canDownloadRecording({ enforceMembership: true, hasEntitlement: false }), false);
assert.equal(canDownloadRecording({ enforceMembership: true, hasEntitlement: true }), true);

console.log('Recording download membership access checks passed');
