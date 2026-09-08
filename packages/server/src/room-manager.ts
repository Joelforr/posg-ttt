import { Room } from './room.js';

export class RoomManager {
    private rooms = new Map<string, Room>();

    getOrCreate(roomCode: string): Room {
        let room = this.rooms.get(roomCode);
        if (!room) {
        room = new Room(roomCode, code => this.rooms.delete(code));
        this.rooms.set(roomCode, room);
        }
        return room;
    }

    get(roomCode: string): Room | undefined {
        return this.rooms.get(roomCode);
    }

    count(): number { return this.rooms.size; }
}