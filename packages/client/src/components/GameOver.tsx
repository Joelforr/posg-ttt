import type { Board } from '@posg-ttt/shared';

interface GameOverProps {
  outcome: 'win' | 'loss' | 'draw';
  reason: string;
  finalBoard: Board;
  onNewGame: () => void;
  onReturnHome: () => void;
}

export const GameOver = (props: GameOverProps) => {
  const { outcome, reason, onReturnHome } = props;
  const label =
    outcome === 'win' ? 'You Won!' :
    outcome === 'loss' ? 'You Lost' :
    'Draw';
  const readableReason = reason?.replace(/_/g, ' ') || "Game Over";

  return (
    <div className='modal-overlay'>
        <div className='modal-content'>
            <div className='modal-accent win'>
            </div> 
            <div className='modal-body'>
                <div className={`text-modal-title text-(--${outcome === 'win' ? 'you--primary' : '--muted'})`}>
                    {label}
                </div>
                <div className='text-modal-desc'> {readableReason}</div>
                <div className='p-[24px_24px] flex flex-col gap-2'>
                    <button className={`submit p-2.5`} onClick={onReturnHome} >
                        Return Home
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
  /*
  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <h2 className={`outcome outcome-${outcome}`}>{label}</h2>
        <p className="reason">{readableReason}</p>
        <div className="mini-board">
          {finalBoard.map((c, i) => (
            <div key={i} className={`mini-cell ${c ? `mini-cell-${c.toLowerCase()}` : ''}`}>
              {c ?? ''}
            </div>
          ))}
        </div>
        <button onClick={onNewGame}>New game</button>
      </div>
    </div>
  );
  */
}