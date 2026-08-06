import { membershipConfig } from '../src/membership/config.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

expectEqual(membershipConfig.enabled, true, 'Shared account client');
expectEqual(membershipConfig.billingEnabled, false, 'Paid actions remain closed');
expectEqual(membershipConfig.productCode, 'rhythmcoach', 'Shared product code');
expectEqual(membershipConfig.entitlementCode, 'rhythmcoach.pro', 'Primary entitlement');
expectEqual(membershipConfig.enforceRecordingDownload, false, 'Recording downloads remain available');

if (!membershipConfig.checkoutFunctionUrl.endsWith('/create-checkout-session')) {
  throw new Error('Future checkout must continue to use the shared Supabase Edge Function.');
}
if (!membershipConfig.portalFunctionUrl.endsWith('/create-portal-session')) {
  throw new Error('Future portal access must continue to use the shared Supabase Edge Function.');
}
if (/sk_(live|test)_|whsec_|sb_secret_|service_role/.test(JSON.stringify(membershipConfig))) {
  throw new Error('Client account configuration contains a server secret.');
}

console.log('RhythmCoach shared account foundation contract passed');
