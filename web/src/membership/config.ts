export const membershipConfig = Object.freeze({
  enabled: true,
  supabaseUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co',
  supabasePublishableKey: 'sb_publishable_n1Va-c_alpkQ0zNuJYUaxA_J0u68RVW',
  entitlementCode: 'rhythmcoach.recording_download',
  redirectUrl: 'https://liuh886.github.io/RhythmCoach/',
  checkoutFunctionUrl: '',
  portalFunctionUrl: '',
  enforceRecordingDownload: false
});

export type MembershipConfig = typeof membershipConfig;
