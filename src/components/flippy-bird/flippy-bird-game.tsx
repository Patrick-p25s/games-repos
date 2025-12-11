
// Ce fichier contient le composant principal pour le jeu Flippy Bird.
'use client';

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { Button } from '@/components/ui/button';
import { Home, RotateCcw, Play, Bird } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

// Constantes de configuration du jeu pour un équilibrage facile.
const BIRD_SIZE = 30; // Taille de l'oiseau en pixels.
const GAME_WIDTH = 400; // Largeur de la zone de jeu.
const GAME_HEIGHT = 600; // Hauteur de la zone de jeu.
const GRAVITY = 0.3; // Force de la gravité appliquée à l'oiseau.
const JUMP_STRENGTH = -7; // Puissance du saut de l'oiseau.
const PIPE_WIDTH = 60; // Largeur des tuyaux.
const PIPE_GAP = 220; // Espace vertical entre les tuyaux.
const PIPE_SPEED = 2.5; // Vitesse de défilement des tuyaux.
const PIPE_INTERVAL = 2000; // Temps en ms entre l'apparition de nouveaux tuyaux.

type GameStatus = 'lobby' | 'ready' | 'playing' | 'over';

// Structure de données pour un tuyau.
type Pipe = {
  x: number; // Position horizontale.
  topHeight: number; // Hauteur du tuyau supérieur.
  passed: boolean; // Si l'oiseau a déjà passé ce tuyau.
};

// État complet du jeu géré par le reducer.
type GameState = {
  status: GameStatus;
  birdPosition: number;
  birdVelocity: number;
  pipes: Pipe[];
  score: number;
  highScore: number;
  newHighScore: boolean;
};

// Actions possibles pour mettre à jour l'état du jeu.
type GameAction =
  | { type: 'READY_GAME'; payload: { highScore: number } }
  | { type: 'START_GAME'; }
  | { type: 'SET_BIRD_VELOCITY'; payload: number }
  | { type: 'GAME_TICK'; payload: { newPosition: number, newVelocity: number, newPipes: Pipe[], pipePassed: boolean }}
  | { type: 'SET_GAME_OVER' }
  | { type: 'LOBBY' };

// État initial du jeu.
const initialState: GameState = {
  status: 'lobby',
  birdPosition: GAME_HEIGHT / 2,
  birdVelocity: 0,
  pipes: [],
  score: 0,
  highScore: 0,
  newHighScore: false,
};

// Reducer pour gérer les transitions d'état du jeu de manière prévisible.
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOBBY':
      return initialState;
    case 'READY_GAME':
      return {
        ...initialState,
        status: 'ready',
        birdPosition: GAME_HEIGHT / 2,
        highScore: action.payload.highScore,
      };
    case 'START_GAME':
        if (state.status !== 'ready') return state;
      return {
        ...state,
        status: 'playing',
        birdVelocity: JUMP_STRENGTH,
      };
    case 'SET_BIRD_VELOCITY':
      if (state.status !== 'playing') return state;
      return {
        ...state,
        birdVelocity: action.payload,
      };
    case 'GAME_TICK':
       if (state.status !== 'playing') return state;
       const { newPosition, newVelocity, newPipes, pipePassed } = action.payload;
       return {
           ...state,
           birdPosition: newPosition,
           birdVelocity: newVelocity,
           pipes: newPipes,
           score: pipePassed ? state.score + 1 : state.score,
       };
    case 'SET_GAME_OVER':
       if (state.status === 'over') return state;
       const isNewHighScore = state.score > state.highScore;
       return {
        ...state,
        status: 'over',
        newHighScore: isNewHighScore,
        highScore: isNewHighScore ? state.score : state.highScore,
       };
    default:
      return state;
  }
}


export function FlippyBirdGame() {
  const { t } = useLocale();
  const { user, updateUserStats } = useAuth();
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { status, birdPosition, birdVelocity, pipes, score, highScore, newHighScore } = state;
  
  const [flash, setFlash] = useState(false);
  const [scoreJustIncreased, setScoreJustIncreased] = useState(false);
  const [statsUpdated, setStatsUpdated] = useState(false);


  const gameLoopRef = useRef<number>();
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameImage = PlaceHolderImages.find(img => img.id === 'flippy-bird');
  const prevScore = useRef(score);
  const lastPipeTimeRef = useRef(0);
  const gameOverTriggeredRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (score > prevScore.current) {
        setScoreJustIncreased(true);
        const timer = setTimeout(() => setScoreJustIncreased(false), 200);
        prevScore.current = score;
        return () => clearTimeout(timer);
    }
  }, [score]);


  // Prépare le jeu pour une nouvelle partie.
  const readyGame = useCallback(() => {
    gameOverTriggeredRef.current = false;
    setStatsUpdated(false);
    dispatch({ type: 'READY_GAME', payload: { highScore: user?.stats.games["Flippy Bird"].highScore || 0 } });
  }, [user]);

  const goToLobby = useCallback(() => {
    dispatch({ type: 'LOBBY' });
  }, []);
  
  // Gère les actions de l'utilisateur (saut ou démarrage).
  const handleUserAction = useCallback(() => {
    if (status === 'playing') {
      dispatch({ type: 'SET_BIRD_VELOCITY', payload: JUMP_STRENGTH });
    } else if (status === 'ready') {
      lastPipeTimeRef.current = Date.now();
      startTimeRef.current = Date.now();
      dispatch({ type: 'START_GAME' });
    }
  }, [status]);
  
  // Déclenche un effet de flash à la fin de la partie
  const triggerGameOver = useCallback(() => {
      if (!gameOverTriggeredRef.current) {
          gameOverTriggeredRef.current = true;
          setFlash(true);
          setTimeout(() => setFlash(false), 200);
          dispatch({ type: 'SET_GAME_OVER' });
      }
  }, []);

  // Boucle de jeu principale, mise à jour à chaque frame.
  const gameLoop = useCallback(() => {
    if (status !== 'playing' || gameOverTriggeredRef.current) {
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        return;
    }
    
    const newVelocity = birdVelocity + GRAVITY;
    const newPosition = birdPosition + newVelocity;

    let newPipes = pipes.map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED })).filter(pipe => pipe.x > -PIPE_WIDTH);
        
    let pipePassed = false;
    newPipes.forEach(pipe => {
      if (!pipe.passed && pipe.x + PIPE_WIDTH < GAME_WIDTH / 2) {
          pipe.passed = true;
          pipePassed = true;
      }
    });
    
    if (Date.now() - lastPipeTimeRef.current > PIPE_INTERVAL) {
        const minPipeHeight = 80;
        const maxPipeHeight = GAME_HEIGHT - PIPE_GAP - 120;
        const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
        newPipes.push({ x: GAME_WIDTH, topHeight: topHeight, passed: false });
        lastPipeTimeRef.current = Date.now();
    }
    
    dispatch({ type: 'GAME_TICK', payload: { newPosition, newVelocity, newPipes, pipePassed }});

    if (newPosition < 0 || newPosition > GAME_HEIGHT - BIRD_SIZE) {
        triggerGameOver();
    }

    for (const pipe of newPipes) {
      const birdRight = GAME_WIDTH / 2 + BIRD_SIZE / 2;
      const birdLeft = GAME_WIDTH / 2 - BIRD_SIZE / 2;
      const pipeRight = pipe.x + PIPE_WIDTH;

      if (birdRight > pipe.x && birdLeft < pipeRight) {
        const birdTop = newPosition;
        const birdBottom = newPosition + BIRD_SIZE;
        const pipeTopEnd = pipe.topHeight;
        const pipeBottomStart = pipe.topHeight + PIPE_GAP;

        if (birdTop < pipeTopEnd || birdBottom > pipeBottomStart) {
            triggerGameOver();
            break;
        }
      }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [birdPosition, birdVelocity, pipes, status, triggerGameOver]);


  // Gère le démarrage et l'arrêt de la boucle de jeu.
  useEffect(() => {
    if (status === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [status, gameLoop]);
  
  // Met à jour les statistiques de l'utilisateur à la fin de la partie.
  useEffect(() => {
    if (status === 'over' && user && !statsUpdated) {
      const playtimeInSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      updateUserStats("Flippy Bird", {
          highScore: score,
          totalPlaytime: playtimeInSeconds,
          pipesPassed: score
      });
      setStatsUpdated(true);
    }
  }, [status, score, user, updateUserStats, statsUpdated]);

  // Gère les entrées du clavier et du clic/toucher.
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleUserAction();
      }
    };
    
    const gameArea = gameAreaRef.current;
    
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
    ? Math.max(-25, Math.min(90, birdVelocity * 6)) // Adjusted for more responsive rotation
    : status === 'over' ? 90 : 0;

  // Affiche l'écran d'accueil du jeu.
  if (status === 'lobby') {
    return (
      <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-8">
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
  
  // Affiche l'écran de fin de partie.
  if (status === 'over') {
    return (
        <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-8">
             <Card className="w-full max-w-sm animate-in fade-in-500 duration-500 text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-destructive font-headline">{t('gameOver')}</CardTitle>
                    <CardDescription className="text-lg">{t('yourScore')}: <span className="font-bold">{score}</span></CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-md text-muted-foreground">{t('highScore')}: <span className="font-bold">{highScore}</span></p>
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

  // Affiche l'écran de jeu principal.
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-8 bg-gray-100 dark:bg-gray-900">
        <div className="text-center mb-4">
            <h1 className="text-4xl font-bold font-headline">{t('flippybird')}</h1>
        </div>
        <div 
            ref={gameAreaRef}
            className={cn(
                "relative overflow-hidden border-4 border-gray-800 rounded-lg shadow-2xl cursor-pointer",
                "bg-sky-400 dark:bg-sky-800 bg-cover bg-center"
            )}
            style={{ 
                width: GAME_WIDTH, 
                height: GAME_HEIGHT,
                backgroundImage: 'url(/img/flippy-bg.png)' 
            }}
        >
            {flash && <div className="absolute inset-0 bg-white opacity-80 z-50 animate-ping" />}

            <div className="absolute inset-x-0 bottom-0 h-28 bg-cover bg-repeat-x" style={{backgroundImage: 'url(/img/flippy-ground.png)', animation: 'scroll-x 10s linear infinite'}} />
            
             <div
                className={cn(
                    "absolute top-4 left-1/2 -translate-x-1/2 text-white text-5xl font-bold z-20 transition-transform duration-200",
                    scoreJustIncreased ? "scale-150" : "scale-100"
                )}
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
            >
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

            <Bird
                className="absolute text-yellow-400 drop-shadow-lg z-10"
                style={{
                    width: BIRD_SIZE,
                    height: BIRD_SIZE,
                    left: (GAME_WIDTH / 2) - (BIRD_SIZE / 2),
                    transform: `translateY(${birdPosition}px) rotate(${birdRotation}deg)`,
                    transition: 'transform 150ms ease-out',
                    fill: 'currentColor',
                }}
            />

            {pipes.map((pipe, index) => (
                <div key={index} className="z-0">
                    <div
                        className="absolute bg-green-600 border-2 border-green-800"
                        style={{
                            width: PIPE_WIDTH,
                            height: pipe.topHeight,
                            top: 0,
                            left: pipe.x,
                            backgroundImage: 'url(/img/pipe.png)',
                            backgroundSize: '100% 100%',
                            transform: 'rotate(180deg)'
                        }}
                    />
                    <div
                        className="absolute bg-green-600 border-2 border-green-800"
                        style={{
                            width: PIPE_WIDTH,
                            height: GAME_HEIGHT - pipe.topHeight - PIPE_GAP,
                            top: pipe.topHeight + PIPE_GAP,
                            left: pipe.x,
                             backgroundImage: 'url(/img/pipe.png)',
                             backgroundSize: '100% 100%',
                        }}
                    />
                </div>
            ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t('clickOrSpaceToJump')}</p>
    </div>
  );
}
