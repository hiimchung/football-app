import { checkProStatus } from './revenuecat';

export interface FeatureAccess {
  canCreateGames: boolean;
  canBoostGames: boolean;
  canSeeAdvancedStats: boolean;
  canSendMessages: boolean;
  maxGamesPerMonth: number;
  hasProPlayerBadge: boolean;
  hasOrganizerProBadge: boolean;
}

export async function getFeatureAccess(): Promise<FeatureAccess> {
  const { isPro, isOrganizer } = await checkProStatus();

  return {
    canCreateGames: true,
    canBoostGames: isOrganizer,
    canSeeAdvancedStats: isPro || isOrganizer,
    canSendMessages: true,
    maxGamesPerMonth: isOrganizer ? -1 : 5,
    hasProPlayerBadge: isPro,
    hasOrganizerProBadge: isOrganizer,
  };
}

export async function canCreateGame(): Promise<boolean> {
  return true;
}

export async function canBoostGame(): Promise<boolean> {
  const { isOrganizer } = await checkProStatus();
  return isOrganizer;
}

export async function canSeeAdvancedStats(): Promise<boolean> {
  const { isPro, isOrganizer } = await checkProStatus();
  return isPro || isOrganizer;
}

export async function getMaxGamesPerMonth(): Promise<number> {
  const { isOrganizer } = await checkProStatus();
  return isOrganizer ? -1 : 5;
}

export function getFeatureDescription(feature: string): string {
  const descriptions: Record<string, string> = {
    canBoostGames: 'Boost your games to reach more players. Available with Organizer Pro subscription.',
    canSeeAdvancedStats: 'View detailed stats and analytics. Available with Pro Player or Organizer Pro subscription.',
    maxGamesPerMonth: 'Create unlimited games per month with Organizer Pro subscription. Free users can create up to 5 games per month.',
  };

  return descriptions[feature] || '';
}

// NOTE: These fallback prices are only for display if RevenueCat fails to load
export const SUBSCRIPTION_PRICES = {
  pro_player: {
    name: 'Pro Player',
    description: 'Access to advanced stats and analytics',
    features: [
      'Advanced statistics',
      'Performance tracking',
      'Pro Player badge',
      'Priority support',
    ],
  },
  organizer_pro: {
    name: 'Organizer Pro',
    description: 'Everything you need to organize amazing games',
    features: [
      'Unlimited games per month',
      'Boost games to reach more players',
      'Advanced statistics',
      'Priority support',
      'Organizer Pro badge',
    ],
  },
};