export type OAuthProvider = 'google' | 'github' | 'x';

export type SubscriptionPresentation = 'active' | 'trial' | 'cancellation' | 'payment';

export function getSubscriptionPresentation(
  status: string | null | undefined,
  cancelAtPeriodEnd: boolean
): SubscriptionPresentation {
  if (status === 'past_due' || status === 'unpaid') return 'payment';
  if (cancelAtPeriodEnd) return 'cancellation';
  if (status === 'trialing') return 'trial';
  return 'active';
}

export function didMembershipUserChange(previousUserId: string | null, currentUserId: string): boolean {
  return previousUserId !== currentUserId;
}
