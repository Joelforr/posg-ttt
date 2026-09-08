import type { WebSocket } from 'ws';
import { checkPrime, randomBytes } from 'node:crypto';
import {validateMove, resolveTurn, checkTerminal, deriveObservation } from '@posg-ttt/engine';
import type { ServerGameState, TerminalOutcome} from '@posg-ttt/engine';
import type { Square, Board, GameSymbol, ServerMessage, PlayerId, Line} from '@posg-ttt/shared';
import { TURN_DURATION_MS, MAX_TURNS, PROTOCOL_VERSION,  ROOM_GC_AFTER_TERMINAL_MS,  ROOM_GC_AFTER_ABANDON_MS,} from './constants.js';
import { emit } from './logger.js';

type JoinResult =
  | { ok: true; player: any }
  | { ok: false; error: 'room_full' | 'invalid_token' };

export class Room {
    state: ServerGameState;
    private wsByPlayer = new Map<PlayerId, WebSocket>();
    private turnTimer: NodeJS.Timeout | null = null;
    private gcTimer: NodeJS.Timeout | null = null;
    private onEmpty: (roomCode: string) => void;


    constructor(roomCode: string, onEmpty: (roomCode: string) => void) {
        this.onEmpty = onEmpty;

        // Placeholder players; real records installed on join.
        this.state = {
            roomCode,
            createdAtMs: Date.now(),
            seed: randomBytes(8).toString('hex'),
            turn: 0,
            phase: 'awaiting_players',
            players: {} as ServerGameState['players'],
            trueBoard: Array.from({length: 16}, () => ({symbol: null, locked: false})) as Board,
            pending: { p1: null, p2: null },
            last: { p1: null, p2: null },
            history: [],
            deadlineMs: 0,
            terminal: null,
        };
    }   

    private sendMessage(playerId: PlayerId, msg: ServerMessage): void {
        const ws = this.wsByPlayer.get(playerId);
        if(ws && ws.readyState === 1){
            ws?.send(JSON.stringify(msg));
        }
    }

    private broadcastMessage(msg: ServerMessage): void {
        for (const key of this.wsByPlayer.keys()){
            this.sendMessage(key, msg);
        }
    }
    
    private scheduleGc(delayMs: number): void {
        if (this.gcTimer) clearTimeout(this.gcTimer);
        this.gcTimer = setTimeout(() => this.onEmpty(this.state.roomCode), delayMs);
    }

    hasP1(): boolean { 
        return !!this.state.players.p1;
    }

    hasP2(): boolean { 
        return !!this.state.players.p2;
    }

    isFull(): boolean { 
        return this.hasP1() && this.hasP2();
    }

    joinPlayer(ws: WebSocket, name?: string, existingToken?: string): JoinResult { 
        //Reconnect flow
        if(existingToken){
            const p1 = this.state.players.p1;
            const p2 = this.state.players.p2;

            if (p1 && p1.token === existingToken){
                this.wsByPlayer.set('p1', ws);
                p1.connected = true;
                this.sendMessage('p2', {type: 'opponent_status', v: PROTOCOL_VERSION, connected: true});
                emit({event: 'reconnect', playerId: p1.playerId})
                return{ok:true, player: p1}
            }

             if (p2 && p2.token === existingToken){
                this.wsByPlayer.set('p2', ws);
                p2.connected = true;
                this.sendMessage('p1', {type: 'opponent_status', v: PROTOCOL_VERSION, connected: true});
                emit({event: 'reconnect', playerId: p2.playerId})
                return{ok:true, player: p2}
            }

            return{ok:false, error:'invalid_token'}
        }
        
        if (this.isFull()) return { ok: false, error: 'room_full' };

        const playerId: PlayerId = this.hasP1() ? 'p2' : 'p1';
        const symbol: GameSymbol = playerId === 'p1' ? 'X' : 'O';
        const player: any = {
            playerId,
            symbol,
            token: randomBytes(12).toString('hex'),
            name,
            connected: true,
            consecutiveTimeouts: 0,
        };
        this.state.players[playerId] = player;
        this.wsByPlayer.set(playerId, ws);

        emit({
            event: 'player_joined',
            roomCode: this.state.roomCode,
            seed: this.state.seed,
            playerId, symbol, name,
        });

        //Start game when we have 2 players
        if (this.isFull() && this.state.phase === 'awaiting_players'){
            this.startGame();
        }
        return {ok: true, player};
    }

    private startGame(): void {
        this.state.phase = 'submit';
        this.state.deadlineMs = Date.now() + TURN_DURATION_MS;
        emit({
            event: 'game_start',
            roomCode: this.state.roomCode,
            seed: this.state.seed,
            players: {
                p1: { token: this.state.players.p1.token, symbol: 'X', name: this.state.players.p1.name },
                p2: { token: this.state.players.p2.token, symbol: 'O', name: this.state.players.p2.name },
            },
        });
        this.emitTurnStart();
    }

    private emitTurnStart(): void{
        const obsP1 = deriveObservation(this.state, 'p1');
        const obsP2 = deriveObservation(this.state, 'p2');

        emit({
            event: 'turn_start',
            roomCode: this.state.roomCode,
            seed: this.state.seed,
            turn: this.state.turn,
            trueBoard: [...this.state.trueBoard],
            observations: { p1: obsP1, p2: obsP2 },
        });

        this.sendMessage('p1', {
            type: 'turn_start', v: PROTOCOL_VERSION,
            observation: obsP1, deadlineMs: this.state.deadlineMs,
        });
        this.sendMessage('p2', {
            type: 'turn_start', v: PROTOCOL_VERSION,
            observation: obsP2, deadlineMs: this.state.deadlineMs,
        });

        this.armTurnTimer();      
    }

    private armTurnTimer(): void {
        if (this.turnTimer) clearTimeout(this.turnTimer);
        const delay = Math.max(0, this.state.deadlineMs - Date.now());
        this.turnTimer = setTimeout(() => this.onDeadline(), delay);
    }

    private onDeadline(): void {
        if (this.state.phase !== 'submit') return;
        (['p1', 'p2'] as const).forEach(pid =>{
            if(this.state.pending[pid] === null){
                this.forceRandomMove(pid);
            }
        });
    }

    private forceRandomMove(playerId: PlayerId): void{
        const exclusion = this.state.last[playerId];
        const min = 0;
        const max = 15;
        let num = -1;

        if (exclusion){
            num = Math.floor(Math.random() * (max - min)) + min;
            if(num >= exclusion){
                num++
            }
        }else{
            num = Math.floor(Math.random() * (max - min + 1)) + min;
        }

        //const result = validateMove(this.state, playerId, num);
        this.state.pending[playerId] = num;
        emit({
            event: 'timeout',
            roomCode: this.state.roomCode, seed: this.state.seed,
            turn: this.state.turn, playerId: playerId, forcedSquare: num,
        });
        this.sendMessage(playerId, {
            type: 'rand_move', v: PROTOCOL_VERSION,
            turn: this.state.turn, square:num    
        });

        if (this.state.pending.p1 !== null && this.state.pending.p2 !== null) {
            this.resolveAndAdvance();
        }
    }

    onMoveSubmit(playerId: PlayerId, msg: {turn: number; square:Square}): void {
        if(this.state.phase !== 'submit'){
            this.sendMessage(playerId, {
                type: 'move_ack', v: PROTOCOL_VERSION,
                turn: msg.turn, accepted: false, reason: 'wrong_phase'
            });
            return;
        }
        if(msg.turn !== this.state.turn){
            this.sendMessage(playerId, {
                type: 'move_ack', v: PROTOCOL_VERSION,
                turn: msg.turn, accepted: false, reason: 'wrong_turn'
            });
            return;
        }
        if(Date.now() > this.state.deadlineMs){
            this.sendMessage(playerId, {
                type: 'move_ack', v: PROTOCOL_VERSION,
                turn: msg.turn, accepted: false, reason: 'turn_expired'
            });
            return;
        }

        const result = validateMove(this.state, playerId, msg.square);
        if(!result.valid){
            this.sendMessage(playerId, {
                type: 'move_ack', v: PROTOCOL_VERSION,
                turn: msg.turn, accepted: false, reason: result.reason
            });
            emit({
                event: 'move_submit',
                roomCode: this.state.roomCode, seed: this.state.seed,
                turn: msg.turn, playerId, square: msg.square,
                accepted: false, reason: result.reason,
            });
            return;
        }

        this.state.pending[playerId] = msg.square;
        emit({
            event: 'move_submit',
            roomCode: this.state.roomCode, seed: this.state.seed,
            turn: msg.turn, playerId, square: msg.square, accepted: true,
        });
        this.sendMessage(playerId, {
            type: 'move_ack', v: PROTOCOL_VERSION,
            turn: msg.turn, accepted: true,       
        });

        if (this.state.pending.p1 !== null && this.state.pending.p2 !== null) {
            this.resolveAndAdvance();
        }
    }

    private resolveAndAdvance(): void {
        if (this.turnTimer) { clearTimeout(this.turnTimer); this.turnTimer = null; }

        const resolution = resolveTurn(this.state);
        this.state.trueBoard = resolution.boardAfter;
        this.state.history.push(resolution);
        this.state.last.p1 = this.state.pending.p1;
        this.state.last.p2 = this.state.pending.p2;
        this.state.pending = { p1: null, p2: null };

        const turnJustResolved = this.state.turn;
        this.state.turn += 1;

        const terminal = checkTerminal(
            this.state.trueBoard, 
            this.state.players.p1.symbol, 
            this.state.players.p2.symbol, 
            turnJustResolved, 
            MAX_TURNS
        );

        if(terminal){
            this.state.phase = 'terminal';
            this.state.terminal = terminal;
        }

        //turn reveal to both players
        (['p1', 'p2'] as const).forEach(pid =>{
            const other: PlayerId = pid === 'p1' ? 'p2' : 'p1';
            const revealTerminal = terminal ? terminalToPlayerView(terminal, pid) : null;
            this.sendMessage(pid, {
                type: 'turn_reveal',
                v: PROTOCOL_VERSION,
                turn: turnJustResolved,
                yourMove: resolution.reveal ? resolution.reveal.position[pid] : null,
                opponentMove: resolution.reveal ? resolution.reveal.position[other] : null,
                yourInvalidated: resolution.reveal ? resolution.reveal.invalidated[pid] : false,
                opponentInvalidated: resolution.reveal ? resolution.reveal.invalidated[other] : false,
                collision: resolution.reveal ? resolution.reveal.collision : false,
                boardAfter: [...resolution.boardAfter] as Board,
                terminal: revealTerminal,
            });
        });

        if (terminal){
            (['p1', 'p2'] as const).forEach(pid => {
                const view = terminalToPlayerView(terminal, pid)!;
                this.sendMessage(pid, {
                type: 'game_over', v: PROTOCOL_VERSION,
                outcome: view.outcome, reason: view.reason,
                finalBoard: [...this.state.trueBoard] as Board,
                });
            }); 
            emit({
                event: 'game_over',
                roomCode: this.state.roomCode, seed: this.state.seed,
                outcome: terminal,
                totalTurns: this.state.turn,
                finalBoard: [...this.state.trueBoard],
            });

            this.scheduleGc(ROOM_GC_AFTER_ABANDON_MS);
        }else{
            this.state.deadlineMs = Date.now() + TURN_DURATION_MS;
            this.emitTurnStart();
        }
    }

    onDisconnect(ws: WebSocket): void {
        for (const pid of ['p1', 'p2'] as const){
            if (this.wsByPlayer.get(pid) === ws){
                this.wsByPlayer.delete(pid);
                const p = this.state.players[pid];
                if (p){p.connected = false;}
                const other: PlayerId = pid === 'p1' ? 'p2' : 'p1';
                this.sendMessage(other, {
                    type: 'opponent_status',
                    v: PROTOCOL_VERSION,
                    connected: false,
                });
                emit({
                    event: 'disconnect',
                    roomCode: this.state.roomCode,
                    seed: this.state.seed,
                    playerId: pid,
                });
                break;
            }
        }
        if(this.wsByPlayer.size === 0) {
            this.scheduleGc(ROOM_GC_AFTER_ABANDON_MS);
        }
    }
}

// Helper: convert a shared TerminalOutcome into the per-player payload
// that goes in turn_reveal.terminal and game_over.
function terminalToPlayerView(terminal: TerminalOutcome, pid: PlayerId): { outcome: 'win' | 'loss' | 'draw'; reason: string; winningLine?: Line } {
    if (terminal.kind === 'win') {
        return {
        outcome: terminal.winner === pid ? 'win' : 'loss',
        reason: 'three_in_a_row',
        winningLine: terminal.line,
        };
    }
    if (terminal.kind === 'draw') {
        return { outcome: 'draw', reason: terminal.reason };
    }
    // forfeit
    return {
        outcome: terminal.winner === pid ? 'win' : 'loss',
        reason: 'forfeit_' + terminal.reason,
    };    
}