export interface GamePlayer {
  id: string;
  name: string;
  avatarUrl?: string | null;
  score: number;
  isReady: boolean;
  isHost: boolean;
}

export interface GameState {
  code: string;
  gameType: string;
  phase: 'lobby' | 'playing' | 'reveal' | 'scoring' | 'ended';
  players: GamePlayer[];
  currentRound: number;
  totalRounds: number;
  timeRemaining?: number;
  gameData: Record<string, unknown>;
}

export interface GameResult {
  finalScores: { playerId: string; name: string; score: number; rank: number }[];
  winner: { playerId: string; name: string; score: number };
  gameType: string;
  rounds: number;
}
