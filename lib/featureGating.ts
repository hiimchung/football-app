import { isProPlayer, isOrganizerPro } from './paypal';

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
  const [proPlayer, organizerPro] = await Promise.all([
    isProPlayer(),
    isOrganizerPro(),
  ]);

  return {
    canCreateGames: true,
    canBoostGames: organizerPro,
    canSeeAdvancedStats: proPlayer || organizerPro,
    canSendMessages: true,
    maxGamesPerMonth: organizerPro ? -1 : 5,
    hasProPlayerBadge: proPlayer,
    hasOrganizerProBadge: organizerPro,
  };
}

export async function canCreateGame(): Promise<boolean> {
  return true;
}

export async function canBoostGame(): Promise<boolean> {
  const organizerPro = await isOrganizerPro();
  return organizerPro;
}

export async function canSeeAdvancedStats(): Promise<boolean> {
  const [proPlayer, organizerPro] = await Promise.all([
    isProPlayer(),
    isOrganizerPro(),
  ]);
  return proPlayer || organizerPro;
}

export async function getMaxGamesPerMonth(): Promise<number> {
  const organizerPro = await isOrganizerPro();
  return organizerPro ? -1 : 5;
}

export function getFeatureDescription(feature: string): string {
  const descriptions: Record<string, string> = {
    canBoostGames: 'Boost your games to reach more players. Available with Organizer Pro subscription.',
    canSeeAdvancedStats: 'View detailed stats and analytics. Available with Pro Player or Organizer Pro subscription.',
    maxGamesPerMonth: 'Create unlimited games per month with Organizer Pro subscription. Free users can create up to 5 games per month.',
  };

  return descriptions[feature] || '';
}

export const SUBSCRIPTION_PRICES = {
  pro_player: {
    price: 9.99,
    currency: 'USD',
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
    price: 19.99,
    currency: 'USD',
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
  boost_game: {
    price: 4.99,
    currency: 'USD',
    name: 'Boost Game',
    description: 'One-time boost to promote your game',
    features: [
      'Featured placement',
      'Reach more players',
      'Valid for 7 days',
    ],
  },
};
