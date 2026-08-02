export interface MembershipConfig {
  enabled: boolean;
  supabaseUrl: string;
  supabasePublishableKey: string;
  entitlementCode: string;
  redirectUrl: string;
  checkoutFunctionUrl: string;
  portalFunctionUrl: string;
  enforceRecordingDownload: boolean;
}

export const membershipConfig: Readonly<MembershipConfig> = Object.freeze({
  enabled: true,
  supabaseUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co',
  supabasePublishableKey: 'sb_publishable_n1Va-c_alpkQ0zNuJYUaxA_J0u68RVW',
  entitlementCode: 'rhythmcoach.recording_download',
  redirectUrl: 'https://liuh886.github.io/RhythmCoach/',
  checkoutFunctionUrl: '',
  portalFunctionUrl: '',
  enforceRecordingDownload: false
});
