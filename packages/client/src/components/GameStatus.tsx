import { useEffect, useRef } from "react";

interface StatusBarProps {
    submitted: boolean;
    opponentPresent: boolean;
}

export const StatusBar = (props: StatusBarProps) =>{
    const {submitted, opponentPresent } = props;
    const hadOpponent = useRef(opponentPresent);

    useEffect(() => {
        if(opponentPresent) hadOpponent.current = true;
    }, [opponentPresent])


    let statusText: string;
    if (!opponentPresent && hadOpponent.current) statusText = 'Opponent disconnected';
    else if (!opponentPresent || submitted) statusText = 'Waiting for opponent…';
    else statusText = 'Submit your move';

    return (
        <div className="">
            <span className="text-status sm text-(--muted)">{statusText}</span>
        </div>
    );
}