export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface User {
  id: string;
  name: string;
  email: string;
  skillLevel: SkillLevel;
  avatar?: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
}

export type GameStatus = 'open' | 'closed';

export interface Game {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  skillLevel: SkillLevel;
  maxPlayers: number;
  host: User;
  players: User[];
  latitude?: number | null;
  longitude?: number | null;
  status: GameStatus;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  isCurrentUser: boolean;
}

export interface Stats {
  matchesPlayed: number;
  goals: number;
  assists: number;
}

export type SubscriptionPlan = 'pro_player' | 'organizer_pro' | 'boost_game';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending' | 'completed';

export interface Subscription {
  id: string;
  user_id: string;
  paypal_subscription_id?: string;
  paypal_order_id?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}
