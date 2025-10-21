export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  isAlive: boolean;
}

export interface BombState {
  holderId: string | null;
  timeRemaining: number;
}

export type GamePhase = 'WAITING' | 'MATCHING' | 'PLAYING' | 'GAME_OVER';

export interface GameState {
  phase: GamePhase;
  players: Map<string, Player>;
  bomb: BombState;
  matchingTimer: number; // seconds until game starts
  gameOverTimer: number; // seconds until reset
}

export interface Position {
  x: number;
  y: number;
}

