import { Cell } from './Cell';
import type { Board, GameSymbol } from '@posg-ttt/shared';
import type { RevealSnapshot } from '../socket';

interface BoardProps {
    board: Board;
    yourSymbol: GameSymbol | null;
    //observation: Observation;
    //selectedSquare: number | null;
    lastReveal: RevealSnapshot | null;
    //terminal: TerminalSnapshot | null;
    onSelect: (square: number) => void;
    //submitLocked: boolean;
}

export const GameBoard = (props: BoardProps) => {
    const {board, yourSymbol, onSelect } = props;

    return (
        <div className="board">
        {board.map((cell, i) => {
            return (
            <Cell
                key={i}
                index={i}
                value={cell}
                yourSymbol = {yourSymbol}
                isInteractable={false}
                isForbidden={false}
                isRevealedYours={props.lastReveal?.yourReveal === i}
                isRevealedOpponent={props.lastReveal?.opponentReveal === i}
                isRevealBlocked={(props.lastReveal?.yourReveal === i && props.lastReveal.yourInvalidated) || (props.lastReveal?.opponentReveal === i && props.lastReveal?.opponentInvalidated)}
                isCollision={props.lastReveal?.yourReveal === i && props.lastReveal?.collision}
                isSelected={false}
                disabled={false}
                onClick={() => onSelect(i)}
            />
            );
        })}
        </div>
    );
}