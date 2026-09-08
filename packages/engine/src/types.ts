import type { Board, Square, GameSymbol, PlayerId, Line } from '@posg-ttt/shared';
export type { Board, Square, GameSymbol, PlayerId, Line };

export type Phase = 'awaiting_players' | 'submit' | 'resolving' | 'terminal';

export interface PlayerRecord {
  playerId: PlayerId;
  symbol: GameSymbol;
  token: string;
  name?: string;
  connected: boolean;
  consecutiveTimeouts: number;
}

export interface ResolutionReveal{
    position : { p1: Square | null; p2: Square | null };
    invalidated: { p1: boolean; p2: boolean };
    collision: boolean;
}

export interface TurnResolution {
  turn: number;
  submitted: { p1: Square | null; p2: Square | null };
  invalidated: { p1: boolean; p2: boolean };
  collision: boolean;
  reveal: ResolutionReveal | null;
  boardBefore: Board;
  boardAfter: Board; 
}

export type TerminalOutcome =
  | { kind: 'win'; winner: PlayerId; line: Line }
  | { kind: 'draw'; reason: 'simultaneous_win' | 'turn_limit' }
  | { kind: 'forfeit'; winner: PlayerId; reason: 'disconnect' | 'timeout' };

export interface ServerGameState {
  roomCode: string;
  createdAtMs: number;
  seed: string;
  turn: number;
  phase: Phase;
  players: { p1: PlayerRecord; p2: PlayerRecord };
  trueBoard: Board;
  pending: { p1: Square | null; p2: Square | null };
  last: { p1: Square | null; p2: Square | null };
  history: TurnResolution[];
  deadlineMs: number;
  terminal: TerminalOutcome | null;
}