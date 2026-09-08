import type { Cell as CellValue, GameSymbol } from '@posg-ttt/shared';
import { useEffect, useRef, useState } from 'react';


interface CellProps {
  index: number;
  value: CellValue;
  yourSymbol: GameSymbol | null;
  isInteractable: boolean;
  isRevealedYours: boolean;
  isRevealedOpponent: boolean;
  isRevealBlocked: boolean;
  isCollision: boolean;
  isForbidden: boolean;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}

export const Cell = (props: CellProps) =>{

    const classes = ['cell'];
    if (props.isInteractable) classes.push('cell-interactable');
    if (props.value.symbol === 'X') props.isInteractable ? classes.push('') : classes.push('cell-x');
    if (props.value.symbol === 'O') props.isInteractable ? classes.push('') : classes.push('cell-o');

    if (props.value.symbol){
        if(props.value.locked){
            (props.value.symbol === props.yourSymbol) ? classes.push('cell-yours-captured') : classes.push('cell-opponent-captured');
        }
        else{
            (props.value.symbol === props.yourSymbol) ? classes.push('cell-yours') : classes.push('cell-opponent');
        }
    }

    if (props.isRevealedYours) classes.push('cell-yours-last');
    if (props.isRevealedOpponent) classes.push('cell-opponent-last');
    if (props.isCollision) classes.push('cell-collision');


    if (props.isForbidden && props.isInteractable) classes.push('cell-forbidden');
    if (props.isSelected && props.isInteractable) classes.push('cell-selected');

    const [animate, setAnimate] = useState(false);
    const [animation, setAnimation] = useState('');
    const timerId = useRef<number|null>(null);

    const clearTimer = () =>{
        if(timerId.current === null) return;
        clearTimeout(timerId.current);
        timerId.current = null;
    }
    
    useEffect(()=>{
        clearTimer();
        setAnimate(true);
        
        setAnimation('animate-cell-flip');
        timerId.current = setTimeout(() => {
            setAnimate(false);
        }, 1000);
    }, [props.value.symbol, props.value.locked])

    useEffect(()=>{
        if(props.isRevealBlocked === false) return;
        clearTimer();
        setAnimate(true);
        
        setAnimation('animate-cell-shake')
        setTimeout(() => {
            setAnimate(false);
        }, 1000);
    }, [props.isRevealBlocked])

    return (
        <button
            type="button"
            className={` ${classes.join(' ')} ${animate ? animation : ''}`}
            
            onClick={props.onClick}
            disabled={props.disabled || props.isForbidden}
            aria-label={`Cell ${props.index}`}
        >
            <span className="cell-content">
                {!props.isInteractable && (
                    <div>{props.value.symbol ?? ''}</div>
                )}
                {props.isSelected && (
                    <div className=' w-3 h-3 rounded-[50%] bg-(--you-primary) opacity-70'></div>
                )}
            </span>
        </button>
    )
}
