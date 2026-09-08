import json
import os
import websocket
from typing import Any, Callable

WS_URL = os.environ.get("TTT_WS_URL", "ws://localhost:8080/ws")
PROTOCOL_VERSION = 1

def connect(url: str = WS_URL) -> websocket.WebSocket:
    ws = websocket.WebSocket()
    ws.connect(url)
    return ws

def send(ws: websocket.WebSocket, msg:dict) -> None:
    ws.send(json.dumps({"v": PROTOCOL_VERSION, **msg}))

def recieve(ws: websocket.WebSocket) -> dict:
    return json.loads(ws.recv())

def join_room(ws:websocket.WebSocket, room_code: str) -> dict:
    """Send join_room and return the 'joined' reply."""
    send(ws, {"type": "join_room", "roomCode": room_code})
    while True:
        msg = recieve(ws)
        if msg["type"] == "joined":
            return msg
        if msg["type"] == "error":
            raise RuntimeError(f"Joined failed: {msg}")

def play_loop(ws: websocket.WebSocket, choose_action: Callable[[dict], int]) -> dict:
    """
    Drive one full game. `choose_action(observation)` returns 0..8.
    Returns the final game_over message.
    """
    last_obs: dict | None = None
    while True:
        msg = recieve(ws)
        t = msg["type"]

        if t == "turn_start":
            last_obs = msg["observation"]
            action = choose_action(last_obs)
            send(ws, {
                "type": "move_submit",
                "turn": last_obs["turn"],
                "square": action,
            })
        elif t == "move_ack":
            if not msg["accepted"] and last_obs is not None:
                # Shouldn't happen for correct bot, but handle it defensively
                action = choose_action(last_obs)
                send(ws, {
                    "type": "move_submit",
                    "turn": last_obs["turn"],
                    "square": action,
                })
        elif t == "turn_reveal":
            pass
        elif t == "opponent_status":
            pass
        elif t == "game_over":
            return msg
        elif t == "error":
            raise RuntimeError(f"Server error: {msg}")
                
    

