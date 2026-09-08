import { TurnReveal, TurnRevealSchema } from '@posg-ttt/shared';
import type { ServerGameState, ResolutionReveal, TurnResolution, Board } from './types';

// Resolve True Board State for backend-only, does not get sent to clients
export function resolveTurn(state: ServerGameState): TurnResolution {
    const m1 = state.pending.p1;
    const m2 = state.pending.p2;
    const sigma1 = state.players.p1.symbol;
    const sigma2 = state.players.p2.symbol;

    let p1Invalidated = m1 === null;
    let p2Invalidated = m2 === null;
    let collision = false;

    if (m1 !== null && m2 !== null && m1 === m2) {
        collision = true;
        p1Invalidated = true;
        p2Invalidated = true;
    }

    const lastResolution = 
        state.history.length > 0 
        ? state.history[state.turn - 1]
        : null;
    
    const p1RevealBlocked = lastResolution !== null && lastResolution.submitted.p1 !== null && state.trueBoard[lastResolution.submitted.p1].locked;
    const p2RevealBlocked = lastResolution !== null && lastResolution.submitted.p2 !== null && state.trueBoard[lastResolution.submitted.p2].locked;

    const resolutionReveal: ResolutionReveal | null = lastResolution ? 
    {
        position: lastResolution.submitted,
        invalidated: {
            p1: lastResolution.invalidated.p1 || p1RevealBlocked,
            p2: lastResolution.invalidated.p2 || p2RevealBlocked
        },
        collision: lastResolution.collision,
    } 
    : null;

    const newBoard: Board = [...state.trueBoard] as Board;
    if(resolutionReveal){
        if (!resolutionReveal.invalidated.p1 && resolutionReveal.position.p1 !== null){
            if(newBoard[resolutionReveal.position.p1].symbol === sigma1) newBoard[resolutionReveal.position.p1].locked = true;
            newBoard[resolutionReveal.position.p1].symbol = sigma1;
        } 
        if (!resolutionReveal.invalidated.p2 && resolutionReveal.position.p2 !== null){
            if(newBoard[resolutionReveal.position.p2].symbol === sigma2) newBoard[resolutionReveal.position.p2].locked = true;
            newBoard[resolutionReveal.position.p2].symbol = sigma2;
        }

        if(resolutionReveal.collision && resolutionReveal.position.p1 !== null) newBoard[resolutionReveal.position.p1].symbol = null;
    }
    

    return {
        turn: state.turn,
        submitted: { p1: m1, p2: m2 },
        invalidated: { p1: p1Invalidated, p2: p2Invalidated },
        collision,
        reveal: resolutionReveal,
        boardBefore: [...state.trueBoard] as Board,
        boardAfter: newBoard,
    };
}