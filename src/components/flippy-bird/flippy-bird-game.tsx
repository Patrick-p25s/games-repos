
'use client';

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { Button } from '@/components/ui/button';
import { Home, RotateCcw, Play } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';

const BIRD_SIZE = 30;
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const GRAVITY = 0.4;
const JUMP_STRENGTH = -7;
const PIPE_WIDTH = 60;
const PIPE_GAP = 240;
const PIPE_SPEED = 3;
const PIPE_INTERVAL = 1500;

type GameStatus = 'lobby' | 'ready' | 'playing' | 'over';

type Pipe = {
  x: number;
  topHeight: number;
  scored: boolean;
};

type GameState = {
  status: GameStatus;
  birdPosition: number;
  birdVelocity: number;
  pipes: Pipe[];
  score: number;
  startTime: number;
};

type GameAction =
  | { type: 'START_GAME' }
  | { type: 'READY_GAME' }
  | { type: 'JUMP' }
  | { type: 'GAME_TICK'; payload: { time: number; lastPipeTime: number } }
  | { type: 'SET_GAME_OVER' };


const initialState: GameState = {
  status: 'lobby',
  birdPosition: GAME_HEIGHT / 2,
  birdVelocity: 0,
  pipes: [],
  score: 0,
  startTime: 0,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'READY_GAME':
      return {
        ...initialState,
        status: 'ready',
        startTime: 0,
      };
    case 'START_GAME':
      return {
        ...state,
        status: 'playing',
        birdVelocity: JUMP_STRENGTH,
        startTime: Date.now(),
      };
    case 'JUMP':
      if (state.status !== 'playing') return state;
      return {
        ...state,
        birdVelocity: JUMP_STRENGTH,
      };
    case 'SET_GAME_OVER':
       if (state.status === 'over') return state;
       return {
        ...state,
        status: 'over',
       }
    case 'GAME_TICK': {
      if (state.status !== 'playing') return state;

      const { time, lastPipeTime } = action.payload;

      // Bird physics
      const newVelocity = state.birdVelocity + GRAVITY;
      const newPosition = state.birdPosition + newVelocity;
      
      // Pipe logic
      let newPipes = state.pipes
        .map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
        .filter(pipe => pipe.x > -PIPE_WIDTH);

      let updatedScore = state.score;

      newPipes.forEach(pipe => {
        if (!pipe.scored && pipe.x < GAME_WIDTH / 2 - BIRD_SIZE / 2) {
          pipe.scored = true;
          updatedScore += 1;
        }
      });
      
      // Generate new pipes
      if (time - lastPipeTime > PIPE_INTERVAL) {
        const minPipeHeight = 80;
        const maxPipeHeight = GAME_HEIGHT - PIPE_GAP - 120; // Adjusted for more consistent gaps
        const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
        newPipes.push({ x: GAME_WIDTH, topHeight: topHeight, scored: false });
        // This is a bit of a hack, but we need to update the lastPipeTime in the parent component
        // A more complex solution would involve passing a callback, but this is simpler for now.
        (window as any)._lastPipeTime = time;
      }

      return {
        ...state,
        birdVelocity: newVelocity,
        birdPosition: newPosition,
        pipes: newPipes,
        score: updatedScore
      };
    }
    default:
      return state;
  }
}


export function FlippyBirdGame() {
  const { t } = useLocale();
  const { user, updateUserStats } = useAuth();
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { status, birdPosition, birdVelocity, pipes, score, startTime } = state;

  const [highScore, setHighScore] = useState(0);
  const [newHighScore, setNewHighScore] = useState(false);
  const [statsUpdated, setStatsUpdated] = useState(false);

  const gameLoopRef = useRef<number>();
  const lastPipeTimeRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameImage = PlaceHolderImages.find(img => img.id === 'flippy-bird');


  useEffect(() => {
    if (user) {
        setHighScore(user.stats.games["Flippy Bird"].highScore);
    }
  }, [user]);

  const readyGame = useCallback(() => {
    setNewHighScore(false);
    setStatsUpdated(false);
    lastPipeTimeRef.current = 0;
    dispatch({ type: 'READY_GAME' });
  }, []);
  
  const handleUserAction = useCallback(() => {
    if (status === 'playing') {
      dispatch({ type: 'JUMP' });
    } else if (status === 'ready') {
      lastPipeTimeRef.current = performance.now();
      dispatch({ type: 'START_GAME' });
    }
  }, [status]);
  
  const gameLoop = useCallback((time: number) => {
    dispatch({ type: 'GAME_TICK', payload: { time, lastPipeTime: lastPipeTimeRef.current } });
    
    // Update lastPipeTime based on the value set in the reducer hack
    if ((window as any)._lastPipeTime) {
      lastPipeTimeRef.current = (window as any)._lastPipeTime;
      delete (window as any)._lastPipeTime;
    }
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const checkCollisions = useCallback(() => {
    // Wall collision (top/bottom)
    if (birdPosition < 0 || birdPosition > GAME_HEIGHT - BIRD_SIZE) {
        dispatch({ type: 'SET_GAME_OVER' });
        return;
    }
    
    // Pipe collision
    for (const pipe of pipes) {
      const birdRight = GAME_WIDTH / 2 + BIRD_SIZE / 2;
      const birdLeft = GAME_WIDTH / 2 - BIRD_SIZE / 2;
      const pipeRight = pipe.x + PIPE_WIDTH;

      if (birdRight > pipe.x && birdLeft < pipeRight) {
        const birdTop = birdPosition;
        const birdBottom = birdPosition + BIRD_SIZE;
        const pipeTop = pipe.topHeight;
        const pipeBottom = pipe.topHeight + PIPE_GAP;

        if (birdTop < pipeTop || birdBottom > pipeBottom) {
            dispatch({ type: 'SET_GAME_OVER' });
            return;
        }
      }
    }
  }, [birdPosition, pipes]);

  useEffect(() => {
      if (status === 'playing') {
          checkCollisions();
      }
  }, [status, birdPosition, pipes, checkCollisions]);
  
  useEffect(() => {
    if (status === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else if (status === 'over') {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [status, gameLoop]);
  
  useEffect(() => {
    if(status === 'over' && !statsUpdated) {
        if(user) {
            const playtime = startTime > 0 ? Math.round((Date.now() - startTime) / 60000) : 0;
            const existingStats = user.stats.games["Flippy Bird"];
            
            if (score > existingStats.highScore) {
              setNewHighScore(true);
              setHighScore(score);
            }

            updateUserStats("Flippy Bird", {
                gamesPlayed: existingStats.gamesPlayed + 1,
                highScore: Math.max(existingStats.highScore, score),
                totalPlaytime: existingStats.totalPlaytime + playtime,
                pipesPassed: (existingStats.pipesPassed || 0) + score,
            });
            setStatsUpdated(true);
        }
    }
  }, [status, score, startTime, statsUpdated, user, updateUserStats]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleUserAction();
      }
    };
    
    const gameArea = gameAreaRef.current;
    
    // Attach listeners when the game is in 'ready' or 'playing' state
    if (status === 'ready' || status === 'playing') {
      gameArea?.addEventListener('click', handleUserAction);
      window.addEventListener('keydown', handleKeyPress);
    }
    
    return () => {
      gameArea?.removeEventListener('click', handleUserAction);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [status, handleUserAction]);

  const birdRotation = status === 'playing'
    ? Math.min(90, birdVelocity * 10 + 20)
    : status === 'over' ? 90 : 0;

  if (status === 'lobby') {
    return (
      <div className="container flex flex-col items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md text-center shadow-lg">
          {gameImage && (
            <CardHeader className="relative h-48 w-full">
              <Image 
                src={gameImage.imageUrl} 
                alt={t('flippybird')} 
                fill
                className="rounded-t-lg object-cover"
                data-ai-hint={gameImage.imageHint}
              />
            </CardHeader>
          )}
          <CardContent className="p-6">
            <CardTitle className="text-3xl font-headline">{t('flippybird')}</CardTitle>
            <CardDescription className="text-lg mt-2 mb-6">{t('flippyBirdInstruction')}</CardDescription>
            <div className="flex flex-col gap-4">
              <Button onClick={readyGame} size="lg">
                <Play className="mr-2" />
                {t('startGame')}
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/">
                  <Home className="mr-2" />
                  {t('backToHome')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (status === 'over') {
    return (
        <div className="container flex flex-col items-center justify-center min-h-screen py-8">
             <Card className="w-full max-w-sm animate-in fade-in-500 duration-500 text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-red-500 font-headline">{t('gameOver')}</CardTitle>
                    <CardDescription className="text-lg">{t('yourScore')}: <span className="font-bold">{score}</span></CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-md text-gray-600 dark:text-gray-400">{t('highScore')}: <span className="font-bold">{highScore}</span></p>
                    {newHighScore && (
                        <p className="mt-2 text-sm font-semibold text-primary">{t('newHighScoreMessage')}</p>
                    )}
                </CardContent>
                <CardContent className="flex flex-col gap-4">
                    <Button onClick={readyGame} size="lg">
                        <RotateCcw className="mr-2" />
                        {t('playAgain')}
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/">
                            <Home className="mr-2" />
                            {t('backToHome')}
                        </Link>
                    </Button>
                </CardContent>
             </Card>
        </div>
    )
  }

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-8 bg-gray-100 dark:bg-gray-900">
        <div className="text-center mb-4">
            <h1 className="text-4xl font-bold font-headline">{t('flippybird')}</h1>
        </div>
        <div 
            ref={gameAreaRef}
            className="relative bg-sky-300 dark:bg-sky-800 overflow-hidden border-4 border-gray-800 rounded-lg shadow-2xl cursor-pointer"
            style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        >
            <div className="absolute top-4 left-4 text-white text-3xl font-bold drop-shadow-lg z-10">
                {score}
            </div>

             {status === 'ready' && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="text-center text-white bg-black/50 p-4 rounded-lg">
                  <h2 className="text-2xl font-bold font-headline">{t('getReady')}</h2>
                  <p className="mt-2 text-lg">{t('clickOrSpaceToStart')}</p>
                </div>
              </div>
            )}

            <div
                className="absolute bg-yellow-400 rounded-full border-2 border-black"
                style={{
                    width: BIRD_SIZE,
                    height: BIRD_SIZE,
                    left: (GAME_WIDTH / 2) - (BIRD_SIZE / 2),
                    transform: `translateY(${birdPosition}px) rotate(${birdRotation}deg)`,
                    transition: status === 'playing' ? 'transform 100ms linear' : 'none',
                }}
            />

            {pipes.map((pipe, index) => (
                <div key={index}>
                    <div
                        className="absolute bg-green-600"
                        style={{
                            width: PIPE_WIDTH,
                            height: pipe.topHeight,
                            top: 0,
                            left: pipe.x,
                        }}
                    />
                    <div
                        className="absolute bg-green-600"
                        style={{
                            width: PIPE_WIDTH,
                            height: GAME_HEIGHT - pipe.topHeight - PIPE_GAP,
                            top: pipe.topHeight + PIPE_GAP,
                            left: pipe.x,
                        }}
                    />
                </div>
            ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t('clickOrSpaceToJump')}</p>
    </div>
  );
}

    