import { readFile } from 'node:fs/promises';
import { membershipConfig } from '../src/membership/config.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

expectEqual(membershipConfig.enabled, true, 'Shared account client');
expectEqual(membershipConfig.billingEnabled, true, 'Paid actions are enabled');
expectEqual(membershipConfig.productCode, 'rhythmcoach', 'Shared product code');
expectEqual(membershipConfig.entitlementCode, 'rhythmcoach.pro', 'Primary entitlement');
expectEqual(membershipConfig.enforceRecordingDownload, true, 'Recording downloads require membership');

if (!membershipConfig.checkoutFunctionUrl.endsWith('/create-checkout-session')) {
  throw new Error('Checkout must use the shared Supabase Edge Function.');
}
if (!membershipConfig.portalFunctionUrl.endsWith('/create-portal-session')) {
  throw new Error('Portal access must use the shared Supabase Edge Function.');
}
if (/sk_(live|test)_|whsec_|sb_secret_|service_role/.test(JSON.stringify(membershipConfig))) {
  throw new Error('Client account configuration contains a server secret.');
}

const providerSource = await readFile(new URL('../src/membership/MembershipProvider.tsx', import.meta.url), 'utf8');
const dialogSource = await readFile(new URL('../src/membership/MembershipDialog.tsx', import.meta.url), 'utf8');

for (const contract of [
  "from<MembershipSubscription>('subscriptions')",
  'hasPaidSubscription',
  "mode === 'portal' && !subscription",
]) {
  if (!providerSource.includes(contract)) throw new Error(`Membership provider is missing subscription contract: ${contract}`);
}
for (const contract of [
  'membership.hasPaidSubscription',
  'membership.isPro && membership.hasPaidSubscription',
  'membership-pro-card',
  'Secure checkout with Stripe',
]) {
  if (!dialogSource.includes(contract)) throw new Error(`Membership dialog is missing Pro flow contract: ${contract}`);
}

console.log('RhythmCoach Pro membership and paid-subscription separation contract passed');
