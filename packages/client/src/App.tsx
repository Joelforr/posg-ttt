import { useState, useCallback, useEffect } from 'react'
import './App.css'

import { useGameSocket } from './socket'
import {GameBoard} from "./components/Board"
import {generateRoomCode, Landing} from "./components/Landing"
import { TurnBar } from './components/TurnBar'
import { GameController } from './components/Controller'
import { StatusBar } from './components/GameStatus'
import { GameOver } from './components/GameOver'
import { ErrorScreen } from './components/ErrorScreen'
import { Waiting } from './components/Waiting'

function readRoomFromUrl(): string | null {
  const m = window.location.pathname.match(/^\/r\/([A-Z0-9]{1,16})$/);
  return m ? m[1] : null; 
}

function isKnownRoute(): boolean {
  const p = window.location.pathname;
  return p === '/' || /^\/r\/[A-Z0-9]{1,16}$/.test(p);
}

function App() {
  const {state, connect, joinRoom, submitMove, selectSquare, reset, leave} = useGameSocket();
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);

   // Open the socket once on mount.
  useEffect(() => { connect(); }, [connect]);

  //Once connected, if URL has room code, join automatically
  useEffect(() => {
    if (state.connStatus !== 'connected') return;
    if(autoJoinAttempted) return;
    if (state.roomCode) return;
    const codeFromUrl = readRoomFromUrl();
    if(!codeFromUrl) return;
    const storedToken = localStorage.getItem(`token:${codeFromUrl}`) ?? undefined;
    joinRoom(codeFromUrl, storedToken);
    setAutoJoinAttempted(true);
    
  }, [state.connStatus, state.roomCode, autoJoinAttempted, joinRoom]);

  const handleNewGame = useCallback(() => {
    const code = generateRoomCode();
    reset();
    setAutoJoinAttempted(false);
    window.history.pushState(null, '', `/r/${code}`); //update URL without triggering re-render
    // Give the reducer a beat, then join.
    setTimeout(() => {
      joinRoom(code);
      setAutoJoinAttempted(true);
    }, 50);
  }, [reset, joinRoom])

  const handleReturnHome = useCallback(()=>{
    leave();
    setAutoJoinAttempted(false);
    window.history.pushState(null, '', '/')
  }, [leave]);

  const handleLandingJoin = useCallback((roomCode: string) =>{
    connect();
    const storedToken = localStorage.getItem(`token:${roomCode}`) ?? undefined;
    joinRoom(roomCode, storedToken);
    setAutoJoinAttempted(true);
  }, [connect, joinRoom]);

  const handleCellClick = useCallback((i:number) => {
    console.log(`Clicked ${i}`);
    selectSquare(i);
  }, [selectSquare]);

  const handleSubmit = useCallback(() =>{
    if(state.selectedSquare === null || !state.observation) return;
    submitMove(state.observation.turn, state.selectedSquare);
  }, [submitMove, state.selectedSquare, state.observation]);


  if(!isKnownRoute()){
    return (
      <ErrorScreen
      code="404"
      title="Page Not Found"
      subtitle='Not Found'
      message="This page does not exist or the URL link has expired. Check URL and please try again."
      actionLabel="Return Home"
      onAction={() => { window.location.href = '/'; }}
      />
    )
  }

  if(state.error){
    return (
      <ErrorScreen
      code="500"
      title="Something Went Wrong"
      subtitle={state.error}
      message="An unexpected error occurred. Please try again."
      actionLabel="Try Again"
      onAction={() => { window.location.href = '/'; }}
      />
    )
  }

 if(!state.roomCode && !readRoomFromUrl()){
    return (
      <>
      <section id="center">
        <Landing onJoin={handleLandingJoin}/>
      </section>
      </>
    )
 }

  return (
    <>
      <section id="center">
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
        </div>
        
        
        <div className='w-110 bg-[#F4F5F7] rounded-3xl p-[24px_24px_20px] border-[3px] border-[rgba(0,0,0,0.07)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'>
          {!state.observation &&
            <div className='absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[40%]'>
              <Waiting onAction={handleReturnHome}/>
            </div>
          }

          <TurnBar turn={state.observation?.turn} yourSymbol={state.observation?.yourSymbol} deadlineMs={state.observation?.deadlineMs || Date.now() + 30000} roomCode={state.roomCode || ''}/>
          <GameBoard board={state.lastReveal?.boardAfter || Array.from({length: 16}, () => ({symbol: null, locked: false}))} yourSymbol={state.symbol} lastReveal={state.lastReveal} onSelect={(i:number) => console.log(`Clicked ${i}`) }/>
          <StatusBar submitted={state.ackStatus === 'accepted'} opponentPresent={state.opponentPresent}></StatusBar>
        </div>
        
        {state.observation &&
          <GameController board={Array.from({length: 16}, () => ({symbol: null, locked: false}))} observation={state.observation} selectedSquare={state.selectedSquare} ackStatus={state.ackStatus} onSelect={handleCellClick} onSubmit={handleSubmit}></GameController>
        }
        
        {state.terminal && 
          (<GameOver outcome={state.terminal?.outcome} reason={state.terminal?.reason} finalBoard={state.terminal?.finalBoard} onNewGame={handleNewGame} onReturnHome={handleReturnHome}></GameOver>)
        }
        
      </section>
    </>
  )
}

export default App
