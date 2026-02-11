import { isProMember } from './revenuecat';

export interface FeatureAccess {
  canCreateGames: boolean;
  canBoostGames: boolean;
  canSeeAdvancedStats: boolean;
  canSendMessages: boolean;
  maxGamesPerMonth: number;
  hasProBadge: boolean;
}

export async function getFeatureAccess(): Promise<FeatureAccess> {
  const isPro = await isProMember();

  return {
    canCreateGames: true,
    canBoostGames: isPro,
    canSeeAdvancedStats: isPro,
    canSendMessages: true,
    maxGamesPerMonth: isPro ? -1 : 5, // -1 means unlimited
    hasProBadge: isPro,
  };
}

export async function canBoostGame(): Promise<boolean> {
  return await isProMember();
}

export async function canSeeAdvancedStats(): Promise<boolean> {
  return await isProMember();
}

export async function getMaxGamesPerMonth(): Promise<number> {
  const isPro = await isProMember();
  return isPro ? -1 : 5;
}

export function getFeatureDescription(feature: string): string {
  const descriptions: Record<string, string> = {
    canBoostGames: 'Boost your games to reach more players. Available with Pro Subscription.',
    canSeeAdvancedStats: 'View detailed stats and analytics. Available with Pro Subscription.',
    maxGamesPerMonth: 'Create unlimited games per month with Pro Subscription. Free users can create up to 5 games.',
  };

  return descriptions[feature] || '';
}

// Fallback display info
export const PRO_SUBSCRIPTION_FEATURES = [
  'Unlimited game creation',
  'Advanced player statistics',
  'Boost games to top of list',
  'Pro profile badge',
  'Priority support'
];