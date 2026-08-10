import {
  didMembershipUserChange,
  getSubscriptionPresentation,
  type OAuthProvider
} from '../src/membership/policy.js';

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

const providers: OAuthProvider[] = ['google', 'github', 'x'];
expectEqual(providers.join(','), 'google,github,x', 'Supported OAuth providers');
expectEqual(didMembershipUserChange(null, 'user-a'), true, 'First signed-in user resets membership state');
expectEqual(didMembershipUserChange('user-a', 'user-a'), false, 'Same user refresh keeps verified membership state');
expectEqual(didMembershipUserChange('user-a', 'user-b'), true, 'Account switch resets membership state');
expectEqual(getSubscriptionPresentation('active', false), 'active', 'Active subscription');
expectEqual(getSubscriptionPresentation('trialing', false), 'trial', 'Active trial');
expectEqual(getSubscriptionPresentation('trialing', true), 'cancellation', 'Cancelled trial');
expectEqual(getSubscriptionPresentation('past_due', true), 'payment', 'Payment issue outranks cancellation');

console.log('RhythmCoach membership lifecycle policy passed');
