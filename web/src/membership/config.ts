export interface MembershipConfig {
  enabled: boolean;
  billingEnabled: boolean;
  productCode: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  entitlementCode: string;
  redirectUrl: string;
  checkoutFunctionUrl: string;
  portalFunctionUrl: string;
  enforceRecordingDownload: boolean;
  turnstileSiteKey: string;
}

export const membershipConfig: Readonly<MembershipConfig> = Object.freeze({
  enabled: true,
  billingEnabled: true,
  productCode: 'rhythmcoach',
  supabaseUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co',
  supabasePublishableKey: 'sb_publishable_n1Va-c_alpkQ0zNuJYUaxA_J0u68RVW',
  entitlementCode: 'rhythmcoach.pro',
  redirectUrl: 'https://liuh886.github.io/RhythmCoach/',
  checkoutFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-checkout-session',
  portalFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-portal-session',
  enforceRecordingDownload: true,
  turnstileSiteKey: '0x4AAAAAAEKVMnWa2valozxW'
});
