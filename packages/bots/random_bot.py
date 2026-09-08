import random
import sys
from protocol import connect, join_room, play_loop

def choose_action(obs: dict) -> int:
    forbidden = obs["forbiddenSquare"]
    legal = [i for i in range(16) if i != forbidden]
    return random.choice(legal)

def main() -> None: 
    room_code = sys.argv[1] if len(sys.argv) > 1 else "BOT01"
    ws = connect()
    joined = join_room(ws, room_code)
    print(f"joined as {joined['playerId']} playing {joined['symbol']}", flush=True)
    result = play_loop(ws, choose_action)
    print(f"game over: {result['outcome']} ({result['reason']})", flush=True)
    ws.close()

if __name__ == "__main__":
    main()
