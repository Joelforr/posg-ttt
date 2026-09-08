import type { Board, Line, GameSymbol, TerminalOutcome } from './types';

export const LINES: ReadonlyArray<[number, number, number, number]> = [
    [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], // rows
    [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15], // cols
    [0, 5, 10, 15], [3, 6, 9, 12],            // diagonals
];

export function fourInARow(board: Board, symbol: GameSymbol): Line | null {
    for (const line of LINES) {
        if (
            board[line[0]].symbol === symbol &&
            board[line[1]].symbol === symbol &&
            board[line[2]].symbol === symbol &&
            board[line[3]].symbol === symbol
        ) {
            return line;
        }
    }
    return null;
}

export function checkTerminal(board: Board, symbolP1: GameSymbol, symbolP2: GameSymbol, turnJustResolved: number, maxTurns: number): TerminalOutcome | null {
    const line1 = fourInARow(board, symbolP1);
    const line2 = fourInARow(board, symbolP2);

    if (line1 && line2) return { kind: 'draw', reason: 'simultaneous_win' };
    if (line1) return { kind: 'win', winner: 'p1', line: line1 };
    if (line2) return { kind: 'win', winner: 'p2', line: line2 };
    
    // turnJustResolved is 0-indexed: after resolving turn (maxTurns - 1),
    // we've used all maxTurns turns.
    if (turnJustResolved + 1 >= maxTurns) {
        return { kind: 'draw', reason: 'turn_limit' };
    }
    return null;
}