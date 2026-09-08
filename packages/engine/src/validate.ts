import type { ServerGameState, PlayerId, Square } from './types';

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: 'wrong_phase' | 'out_of_bounds' | 'two_turn_repeat' };

export function validateMove(state: ServerGameState, playerId: PlayerId, move: unknown): ValidationResult {
  if (state.phase !== 'submit') {
    return { valid: false, reason: 'wrong_phase' };
  }
  if (
    typeof move !== 'number' ||
    !Number.isInteger(move) ||
    move < 0 ||
    move > 15
  ) {
    return { valid: false, reason: 'out_of_bounds' };
  }
  const last = state.last[playerId];
  if (last !== null && last === move) {
    return { valid: false, reason: 'two_turn_repeat' };
  }
  return { valid: true };
}