import type { WebSocket } from 'ws';
import { ClientMessageSchema } from '@posg-ttt/shared';
import type { PlayerId } from '@posg-ttt/shared';
import type { RoomManager } from './room-manager.js';
import type { Room } from './room.js';
import { PROTOCOL_VERSION } from './constants.js';

export function handleConnection(ws: WebSocket, roomManager: RoomManager): void {
    let boundRoom: Room | null = null;
    let boundPlayerId: PlayerId | null = null;

    ws.on('message', (raw: Buffer | string) => {
        let parsed: unknown;
        try {
        parsed = JSON.parse(raw.toString());
        } catch {
        sendError(ws, 'invalid_message', 'Malformed JSON');
        return;
        }

        const result = ClientMessageSchema.safeParse(parsed);
        if (!result.success) {
        sendError(ws, 'invalid_message', 'Schema validation failed');
        return;
        }
        const msg = result.data;

        if (msg.type === 'join_room') {
        if (boundRoom) {
            sendError(ws, 'already_joined', 'This connection is already in a room');
            return;
        }
        const room = roomManager.getOrCreate(msg.roomCode);
        const joinResult = room.joinPlayer(ws, msg.playerName, msg.playerToken);
        if (!joinResult.ok) {
            sendError(ws, joinResult.error, 'Cannot join room');
            return;
        }
        boundRoom = room;
        boundPlayerId = joinResult.player.playerId;
        const other: PlayerId = boundPlayerId === 'p1' ? 'p2' : 'p1';
        const opponentRec = room.state.players[other];
        ws.send(JSON.stringify({
            type: 'joined',
            v: PROTOCOL_VERSION,
            playerId: joinResult.player.playerId,
            playerToken: joinResult.player.token,
            symbol: joinResult.player.symbol,
            roomCode: room.state.roomCode,
            opponent: {
                present: opponentRec ? opponentRec.connected : false,
                name: opponentRec?.name,
            },
        }));
        return;
        }

        if (!boundRoom || !boundPlayerId) {
        sendError(ws, 'not_joined', 'Send join_room first');
        return;
        }

        if (msg.type === 'move_submit') {
        boundRoom.onMoveSubmit(boundPlayerId, { turn: msg.turn, square: msg.square });
        return;
        }

        if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', v: PROTOCOL_VERSION }));
        return;
        }
    });

    const cleanup = () => { if (boundRoom) boundRoom.onDisconnect(ws); };
    ws.on('close', cleanup);
    ws.on('error', cleanup);
}

function sendError(ws: WebSocket, code: string, message: string): void {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'error', v: PROTOCOL_VERSION, code, message }));
    }
}