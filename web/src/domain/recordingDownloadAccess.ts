export const RECORDING_DOWNLOAD_ENTITLEMENT = 'rhythmcoach.recording_download';

export interface RecordingDownloadAccessInput {
  enforceMembership: boolean;
  hasEntitlement: boolean;
}

export function canDownloadRecording({
  enforceMembership,
  hasEntitlement
}: RecordingDownloadAccessInput): boolean {
  return !enforceMembership || hasEntitlement;
}
