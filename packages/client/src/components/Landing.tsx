import { useState } from 'react';

interface LandingProps {
  onJoin: (roomCode: string, playerName?: string) => void;
}

const ROOM_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return code;
}

export const Landing= (props : LandingProps) => {
  const [code, setCode] = useState('');

  const {onJoin} = props;

  const createRoom = () => {
    const newCode = generateRoomCode();
    window.history.pushState(null, '', `/r/${newCode}`);
    onJoin(newCode);
    //onJoin(newCode, name.trim() || undefined);
  };

  const joinExisting = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    window.history.pushState(null, '', `/r/${trimmed}`);
    onJoin(trimmed);
  };

  return (
    <div className="landing">
      <h1 className='font-jetbrains'>Grid Step</h1>
      <h2 className='text-label'>How to Play</h2>
      <ol className="rules">
        <li>• Connect a line of 4</li>
        <li>• You and your opponent will submit moves at the same time</li>
        <li>• Moves are revealed on end of the <strong>next turn</strong></li>
        <li>• The same move cannot be submitted twice in a row</li>
        <li>• Permanantly lock a square by placing your symbol there twice in a row</li>
        <li>• Squares that aren't locked can have their symbol overriden</li>
        <li>• Revealing the same move as opponent resets the value of square</li>
      </ol>
      <div className="landing-form">
        <div className='flex justify-center gap-10'>
          <button className="primary rounded bg-(--btn-primary-enabled) text-white" onClick={createRoom}>Create room</button>
        </div>
        <div className="or">— or —</div>
        <div className='flex justify-center gap-6'>
          <input
            className='p-1.5 rounded-xl border-2 border-(--border)'
            type="text"
            placeholder="Room code (e.g. ABCDE)"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={16}
          />
          <button className="primary rounded bg-(--btn-primary-enabled) text-white" onClick={joinExisting} disabled={!code.trim()}>Join room</button>
        </div>
      </div>
    </div>
  );
}