import fs from 'node:fs';
import { membershipConfig } from '../src/membership/config.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function expectContains(source: string, value: string, label: string) {
  if (!source.includes(value)) throw new Error(`${label} missing: ${value}`);
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

const providerSource = fs.readFileSync('src/membership/MembershipProvider.tsx', 'utf8');
const dialogSource = fs.readFileSync('src/membership/MembershipDialog.tsx', 'utf8');

for (const contract of [
  "type OAuthProvider = 'google' | 'github' | 'x'",
  'signInWithProvider: (provider: OAuthProvider)',
  'provider,',
  'captchaToken: verifiedToken'
]) {
  expectContains(providerSource, contract, 'Membership provider contract');
}
if (providerSource.includes('signInWithGoogle')) {
  throw new Error('Provider-specific Google helper must not return.');
}

for (const contract of [
  "{ id: 'google', label: text.google }",
  "{ id: 'github', label: text.github }",
  "{ id: 'x', label: text.xProvider }",
  'membership-provider-button',
  'membership-divider',
  'GoogleMark',
  'GitHubMark'
]) {
  expectContains(dialogSource, contract, 'Membership dialog provider UI');
}

console.log('RhythmCoach Pro membership and Google/GitHub/X OAuth contracts passed');
