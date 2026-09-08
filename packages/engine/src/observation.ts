import type { ServerGameState, PlayerId } from './types';
import type { Observation, ObservationHistoryEntry, Board } from '@posg-ttt/shared';

//TODO:: Fix observation history not properly reflecting blocked moves from captured sqaures
export function deriveObservation( state:ServerGameState, playerId: PlayerId): Observation{
    const other: PlayerId = playerId === 'p1' ? 'p2' : 'p1';
    const player = state.players[playerId];
    const opponent = state.players[other];

    const lastResolution = 
        state.history.length > 0 
        ? state.history[state.history.length - 1]
        : null;

    const opponentLastReveal = 
    lastResolution?.reveal 
    ? {
        square: lastResolution.reveal.position[other], 
        collided: lastResolution.reveal.collision
    } 
    : null;

    const history: ObservationHistoryEntry[] = state.history.map(h =>({
        turn: h.turn,
        yourMove: h.submitted[playerId],
        opponentMove: h.submitted[other],
        yourInvalidated: h.invalidated[playerId],
        opponentInvalidated: h.invalidated[other],
        collision: h.collision,
        boardAfter: [...h.boardAfter] as Board,
    }));

    return {
        turn: state.turn,
        phase: state.phase === 'terminal' ? 'terminal' : 'submit',
        yourSymbol: player.symbol,
        opponentSymbol: opponent.symbol,
        visibleBoard: [...state.trueBoard] as Board,
        yourLastMove: state.last[playerId],
        forbiddenSquare: state.last[playerId],
        opponentLastReveal,
        history,
        deadlineMs: state.deadlineMs,
    };
}