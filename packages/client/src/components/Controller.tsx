import { Cell } from './Cell';
import type { Board, Observation } from '@posg-ttt/shared';
import type {AckStatus} from './../socket';

interface ControllerProps {
    board: Board;
    observation: Observation;
    selectedSquare: number | null;
    //lastReveal: RevealSnapshot | null;
    //terminal: TerminalSnapshot | null;
    onSelect: (square: number) => void;
    onSubmit: () => void;
    ackStatus: AckStatus;
}

export const GameController = (props: ControllerProps) => {
    const {board, onSelect, ackStatus } = props;

    return (
        <div className='bg-(--card) rounded-2xl p-3.5 border border-[rgba(74,116,245,0.18)] shadow-[0_6px_24px_rgba(0,0,0,0.11),0_1px_4px_rgba(0,0,0,0.07)]'>
            <div className="board">
            {board.map((cell, i) => {
                return (
                <Cell
                    key={i}
                    index={i}
                    value={cell}
                    yourSymbol={props.observation?.yourSymbol}
                    isInteractable={true}
                    isForbidden={props.observation?.forbiddenSquare === i || props.observation?.yourLastMove === i || props.observation?.visibleBoard[i].locked}
                    isRevealedYours={false}
                    isRevealedOpponent={props.observation?.opponentLastReveal?.square === i}
                    isRevealBlocked={false}
                    isCollision={false}
                    isSelected={props.selectedSquare === i}
                    disabled={false}
                    onClick={() => onSelect(i)}
                />
                );
            })}
            </div>
            <button className={`submit ${ackStatus === 'accepted' && 'submitted'} p-2.5`} disabled={props.selectedSquare === null || ackStatus === 'accepted'} onClick={props.onSubmit}>
                {ackStatus === 'accepted' ? "Submitted ✓" : "Submit Move"}
            </button>
        </div>
    );
}