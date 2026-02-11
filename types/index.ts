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