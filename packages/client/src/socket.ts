import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { ClientMessage,  ServerMessage,  Board,  PlayerId,  GameSymbol,  Square, Observation,} from '@posg-ttt/shared';

// --- Types ---
type ConnStatus = 'disconnected' | 'connecting' | 'connected';
export type AckStatus = 'idle' | 'accepted' | 'rejected';

export interface RevealSnapshot {
    turn: number;
    yourReveal: number | null;
    opponentReveal: number | null;
    yourInvalidated: boolean;
    opponentInvalidated: boolean;
    collision: boolean;
    boardAfter: Board;
}

export interface TerminalSnapshot {
    outcome: 'win' | 'loss' | 'draw';
    reason: string;
    finalBoard: Board;
    winningLine?: [number, number, number];
}

export interface GameState {
    connStatus: ConnStatus;
    roomCode: string | null;
    playerId: PlayerId | null;
    playerToken: string | null;
    symbol: GameSymbol | null;
    opponentPresent: boolean;
    observation: Observation | null;
    lastReveal: RevealSnapshot | null;
    selectedSquare: number | null;
    ackStatus: AckStatus;
    ackReason: string | null;
    terminal: TerminalSnapshot | null;
    error: string | null;
}

const initialState: GameState = {
  connStatus: 'disconnected',
  roomCode: null,
  playerId: null,
  playerToken: null,
  symbol: null,
  opponentPresent: false,
  observation: null,
  lastReveal: null,
  selectedSquare: null,
  ackStatus: 'idle',
  ackReason: null,
  terminal: null,
  error: null,
};

// --- Actions ---
type Action =
    | { type: 'CONN'; status: ConnStatus }
    | { type: 'JOINED';
        playerId: PlayerId; playerToken: string;
        symbol: GameSymbol; roomCode: string;
        opponent: { present: boolean; name?: string } }
    | { type: 'TURN_START'; observation: any }
    | { type: 'MOVE_ACK'; accepted: boolean; reason?: string | null }
    | { type: 'TURN_REVEAL'; reveal: RevealSnapshot }
    | { type: 'GAME_OVER';
        outcome: 'win' | 'loss' | 'draw';
        reason: string; finalBoard: Board;
        winningLine?: [number, number, number] }
    | { type: 'OPPONENT_STATUS'; connected: boolean }
    | { type: 'ERROR'; message: string }
    | { type: 'SELECT'; square: number | null }
    | { type: 'RESET' }; 

function reducer(state: GameState, action: Action):GameState {
    switch (action.type){
        case 'CONN':
            return{
                ...state,
                connStatus: action.status
            };
        case 'JOINED':
            return{
                ...state,
                roomCode: action.roomCode,
                playerId: action.playerId,
                playerToken: action.playerToken,
                symbol: action.symbol,
                opponentPresent: action.opponent.present,
            };
        case 'TURN_START':
            return{
                ...state,
                observation: action.observation,
                selectedSquare: null,
                ackStatus: 'idle',
                ackReason: null,
            };
        case 'MOVE_ACK':
            return{
                ...state,
                ackStatus: action.accepted ? 'accepted' : 'rejected',
                ackReason: action.reason ?? null,
                selectedSquare: action.accepted ? state.selectedSquare : null,
            };
        case 'TURN_REVEAL':
            return{
                ...state,
                lastReveal: action.reveal
            };
        case 'GAME_OVER':
            return{
                ...state,
                terminal: {
                    outcome: action.outcome,
                    reason: action.reason,
                    finalBoard: action.finalBoard,
                    winningLine: action.winningLine
                }
            };
        case 'OPPONENT_STATUS':
            return{
                ...state,
                opponentPresent: action.connected
            };
        case 'ERROR':
            return{
                ...state,
                error: action.message
            };
        case 'SELECT':
            return{
                ...state,
                selectedSquare: action.square
            };
        case 'RESET':
            return{
                ...initialState,
                connStatus: state.connStatus
            };
    }
        
}

// ---------- URL helpers ----------
function getWebSocketUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

// ---------- The hook ----------
export function useGameSocket() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const wsRef = useRef<WebSocket | null>(null);

    const pendingJoinRef = useRef<{ roomCode: string; token?: string } | null>(null);

    const connect = useCallback(() =>{
        if(wsRef.current && wsRef.current.readyState <= 1) return; //already connected

        dispatch({ type: 'CONN', status: 'connecting' });
        const ws = new WebSocket(getWebSocketUrl());
        wsRef.current = ws;

        ws.onopen = () => {
            if (wsRef.current !== ws) return;
            dispatch({ type: 'CONN', status: 'connected' });
            const pending = pendingJoinRef.current;
            if (pending) {
                pendingJoinRef.current = null;
                send({
                type: 'join_room', v: 1,
                roomCode: pending.roomCode,
                playerToken: pending.token,
                });
            }
        }
        
        ws.onclose = () => {
            if (wsRef.current !== ws) return;
            dispatch({ type: 'CONN', status: 'disconnected' });
            wsRef.current = null;
        }

        ws.onerror = () => {
            if (wsRef.current !== ws) return;
            dispatch({ type: 'ERROR', message: 'WebSocket error' });
        }

        ws.onmessage = (ev) => {
            if (wsRef.current !== ws) return;
            let msg: ServerMessage;
            try {
                msg = JSON.parse(ev.data as string);
            }catch{
                return;
            }
            routeMessage(msg, dispatch);
        };
    }, []);

    const send = useCallback((msg: ClientMessage) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN){
            ws.send(JSON.stringify(msg));
        }
    }, []);

    const joinRoom = useCallback((roomCode: string, playerToken?: string) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            send({
                type: 'join_room', v: 1,
                roomCode, playerToken
            });
        } 
        else {
            pendingJoinRef.current = {roomCode, token: playerToken};
        }
        
    }, [send]);

    const submitMove = useCallback((turn: number, square: number) =>{
        send({
            type:'move_submit', v: 1,
            turn, square: square as Square,
        });
    }, [send]);

    const selectSquare = useCallback((square: number | null) =>{
        dispatch({type: 'SELECT', square}) 
    }, []);

    const reset = useCallback(() =>{
        dispatch({type: 'RESET'})
    }, []);

    const leave = useCallback(() => {
        const ws = wsRef.current;
        if(state.roomCode){
            try {
                localStorage.removeItem(`token: ${state.roomCode}`);
            }
            catch{
            }
        }

        if (ws) {
            ws.onopen = null;
            ws.onclose = null;
            ws.onerror = null;
            ws.onmessage = null;
            ws.close();
        }
        wsRef.current = null;
        dispatch({ type: 'RESET' });
        dispatch({ type: 'CONN', status: 'disconnected' });
    }, [state.roomCode]) 

    
    useEffect(() =>{
        return () =>{
            const ws = wsRef.current;
            if (ws) {
                ws.onopen = null;
                ws.onclose = null;
                ws.onerror = null;
                ws.onmessage = null;
                ws.close();
            }
            wsRef.current = null;
        };
    }, []);
    
    return {state, connect, joinRoom, submitMove, selectSquare, reset, leave};

}

// ---------- Server → dispatch routing ----------
function routeMessage(msg: ServerMessage, dispatch:React.Dispatch<Action>){
    switch (msg.type) {
        case 'joined':
            dispatch({
                type: 'JOINED',
                playerId: msg.playerId,
                playerToken: msg.playerToken,
                symbol: msg.symbol,
                roomCode: msg.roomCode,
                opponent: msg.opponent,
            });
            //Persist token for reconnect on refresh
            try{
                localStorage.setItem(`token:${msg.roomCode}`, msg.playerToken)
            }catch{
                
            }
            return;
        case 'turn_start':
            dispatch({
                type: 'TURN_START',
                observation: msg.observation
            });
            return;
        case 'move_ack':
            dispatch({
                type:'MOVE_ACK',
                accepted: msg.accepted,
                reason: msg.reason ?? null,
            });
            return;
        case 'turn_reveal':
            dispatch({
                type:'TURN_REVEAL',
                reveal:{
                    turn:msg.turn,
                    yourReveal: msg.yourMove,
                    opponentReveal: msg.opponentMove,
                    yourInvalidated: msg.yourInvalidated,
                    opponentInvalidated: msg.opponentInvalidated,
                    collision: msg.collision,
                    boardAfter: msg.boardAfter,
                }
            });
            return;
        case 'game_over':
            dispatch({
                type: 'GAME_OVER',
                outcome: msg.outcome,
                reason: msg.reason,
                finalBoard: msg.finalBoard,
            });
            return;
        case 'opponent_status':
            dispatch({ 
                type: 'OPPONENT_STATUS', 
                connected: msg.connected 
            });
            return;
        case 'error':
            dispatch({
                type: 'ERROR', 
                message: `${msg.code}: ${msg.message}`
            });
            return;
        case 'pong':
            return;
            
    }
}