import { membershipConfig } from '../src/membership/config.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

expectEqual(membershipConfig.enabled, true, 'Membership account client');
expectEqual(membershipConfig.billingEnabled, true, 'Billing canary');
expectEqual(membershipConfig.productCode, 'rhythmcoach', 'Server-resolved product code');
expectEqual(membershipConfig.entitlementCode, 'rhythmcoach.pro', 'Primary entitlement');
expectEqual(membershipConfig.enforceRecordingDownload, false, 'Download enforcement stays disabled during canary');

if (!membershipConfig.checkoutFunctionUrl.endsWith('/create-checkout-session')) {
  throw new Error('Checkout must use the shared Supabase Edge Function.');
}
if (!membershipConfig.portalFunctionUrl.endsWith('/create-portal-session')) {
  throw new Error('Portal must use the shared Supabase Edge Function.');
}
if (/sk_(live|test)_|whsec_|sb_secret_|service_role/.test(JSON.stringify(membershipConfig))) {
  throw new Error('Client membership configuration contains a server secret.');
}

console.log('RhythmCoach billing canary contract passed');
