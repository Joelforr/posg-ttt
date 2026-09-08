import { useEffect, useState } from 'react';

interface TurnBarProps {
    turn?: number;
    yourSymbol?: string;
    deadlineMs: number;
    roomCode: string;
}

export const TurnBar = (props: TurnBarProps) =>{
    const { turn, yourSymbol, deadlineMs, roomCode} = props;
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(id);
    }, []);

    const remaining = Math.max(0, deadlineMs - now);
    const pct = (remaining/30_000) * 100;
    const seconds = Math.ceil(remaining / 1000);
    const timerColorStyle = seconds <= 10 ? 'bg-(--danger)' : seconds <= 15 ? 'bg-(--warning)' : 'bg-(--safe)';


    return (
        <div className="turnbar">
        <div className="turnbar-right flex justify-between items-center gap-5 mb-2">
            <span className="text-status header text-(--muted)">LIVE BOARD {yourSymbol}</span>
            <span className='text-status'>
                {`Room Code: ${roomCode}`}
                <button className='icon' onClick={()=> navigator.clipboard.writeText(roomCode)}>⮺</button>
            </span>
            
            <span className="text-status">You are {yourSymbol}</span>
        </div>
        <div className="turnbar-left flex items-center gap-5 mb-4">
            <span className="text-timer">TURN {turn}</span>
            <div className="felx h-1 grow bg-[rgba(0,0,0,0.08)] rounded overflow-hidden">
                <div 
                    className={`h-full rounded ${timerColorStyle}`}
                    style={{width: `${pct}%`}}
                /> 
            </div>
            
            <span className="text-timer">{seconds}s</span>
        </div>
        </div>
    );
}