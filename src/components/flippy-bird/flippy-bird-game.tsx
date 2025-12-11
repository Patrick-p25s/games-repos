
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
const GRAVITY = 0.5; // Force de la gravité appliquée à l'oiseau.
const JUMP_STRENGTH = -8; // Puissance du saut de l'oiseau.
const PIPE_WIDTH = 60; // Largeur des tuyaux.
const PIPE_GAP = 180; // Espace vertical entre les tuyaux.
const PIPE_SPEED = 3; // Vitesse de défilement des tuyaux.
const PIPE_INTERVAL = 1500; // Temps en ms entre l'apparition de nouveaux tuyaux.

type GameStatus = 'lobby' | 'ready' | 'playing' | 'over';

// Structure de données pour un tuyau.
type Pipe = {
  x: number; // Position horizontale.
  topHeight: number; // Hauteur du tuyau supérieur.
};

// État complet du jeu géré par le reducer.
type GameState = {
  status: GameStatus;
  birdPosition: number;
  birdVelocity: number;
  pipes: Pipe[];
  score: number;
  startTime: number | null;
  lastPipeTime: number;
  highScore: number;
  newHighScore: boolean;
};

// Actions possibles pour mettre à jour l'état du jeu.
type GameAction =
  | { type: 'READY_GAME'; payload: { highScore: number } }
  | { type: 'START_GAME'; }
  | { type: 'JUMP' }
  | { type: 'GAME_TICK' }
  | { type: 'SET_GAME_OVER' }
  | { type: 'UPDATE_HIGH_SCORE' };

// État initial du jeu.
const initialState: GameState = {
  status: 'lobby',
  birdPosition: GAME_HEIGHT / 2,
  birdVelocity: 0,
  pipes: [],
  score: 0,
  startTime: null,
  lastPipeTime: 0,
  highScore: 0,
  newHighScore: false,
};

// Reducer pour gérer les transitions d'état du jeu de manière prévisible.
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'READY_GAME':
      return {
        ...initialState,
        status: 'ready',
        highScore: action.payload.highScore,
      };
    case 'START_GAME':
        if (state.status !== 'ready') return state;
      return {
        ...state,
        status: 'playing',
        birdVelocity: JUMP_STRENGTH,
        startTime: Date.now(),
        lastPipeTime: Date.now(),
      };
    case 'JUMP':
      if (state.status !== 'playing') return state;
      return {
        ...state,
        birdVelocity: JUMP_STRENGTH,
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
    case 'GAME_TICK': {
      if (state.status !== 'playing') return state;

      // Applique la gravité à la vitesse de l'oiseau.
      const newVelocity = state.birdVelocity + GRAVITY;
      // Met à jour la position de l'oiseau.
      const newPosition = state.birdPosition + newVelocity;
      
      // Gère le mouvement et la création des tuyaux.
      let newPipes = state.pipes
        .map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
        .filter(pipe => pipe.x > -PIPE_WIDTH);

      let updatedScore = state.score;
      let newLastPipeTime = state.lastPipeTime;
      
      // Crée un nouveau tuyau à intervalle régulier.
      if (Date.now() - state.lastPipeTime > PIPE_INTERVAL) {
        const minPipeHeight = 80;
        const maxPipeHeight = GAME_HEIGHT - PIPE_GAP - 120;
        const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
        newPipes.push({ x: GAME_WIDTH, topHeight: topHeight });
        newLastPipeTime = Date.now();
        
        // Incrémente le score à chaque nouveau tuyau (après le début du jeu).
        if(state.startTime !== null) {
            updatedScore++;
        }
      }

      return {
        ...state,
        birdVelocity: newVelocity,
        birdPosition: newPosition,
        pipes: newPipes,
        score: updatedScore,
        lastPipeTime: newLastPipeTime,
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
  const { status, birdPosition, birdVelocity, pipes, score, startTime, highScore, newHighScore } = state;
  
  const [statsUpdated, setStatsUpdated] = useState(false);
  const gameLoopRef = useRef<number>();
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameImage = PlaceHolderImages.find(img => img.id === 'flippy-bird');

  // Prépare le jeu pour une nouvelle partie.
  const readyGame = useCallback(() => {
    dispatch({ type: 'READY_GAME', payload: { highScore: user?.stats.games["Flippy Bird"].highScore || 0 } });
    setStatsUpdated(false);
  }, [user]);
  
  // Gère les actions de l'utilisateur (saut ou démarrage).
  const handleUserAction = useCallback(() => {
    if (status === 'playing') {
      dispatch({ type: 'JUMP' });
    } else if (status === 'ready') {
      dispatch({ type: 'START_GAME' });
    }
  }, [status]);
  
  // Boucle de jeu principale, mise à jour à chaque frame.
  const gameLoop = useCallback(() => {
    dispatch({ type: 'GAME_TICK' });
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Vérifie les collisions avec le sol, le plafond et les tuyaux.
  const checkCollisions = useCallback(() => {
    // Collision avec les bords supérieur et inférieur.
    if (birdPosition < 0 || birdPosition > GAME_HEIGHT - BIRD_SIZE) {
        dispatch({ type: 'SET_GAME_OVER' });
        return;
    }
    
    // Collision avec les tuyaux.
    for (const pipe of pipes) {
      const birdRight = GAME_WIDTH / 2 + BIRD_SIZE / 2;
      const birdLeft = GAME_WIDTH / 2 - BIRD_SIZE / 2;
      const pipeRight = pipe.x + PIPE_WIDTH;

      if (birdRight > pipe.x && birdLeft < pipeRight) {
        const birdTop = birdPosition;
        const birdBottom = birdPosition + BIRD_SIZE;
        const pipeTopEnd = pipe.topHeight;
        const pipeBottomStart = pipe.topHeight + PIPE_GAP;

        if (birdTop < pipeTopEnd || birdBottom > pipeBottomStart) {
            dispatch({ type: 'SET_GAME_OVER' });
            return;
        }
      }
    }
  }, [birdPosition, pipes]);

  // Exécute la vérification des collisions à chaque mise à jour de la position.
  useEffect(() => {
    if (status === 'playing') {
        checkCollisions();
    }
  }, [status, birdPosition, pipes, checkCollisions]);
  
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
    if(status === 'over' && !statsUpdated && user && startTime !== null) {
        const playtimeInSeconds = Math.round((Date.now() - startTime) / 1000);
        const existingStats = user.stats.games["Flippy Bird"];
        
        updateUserStats("Flippy Bird", {
            gamesPlayed: existingStats.gamesPlayed + 1,
            highScore: Math.max(existingStats.highScore, score),
            totalPlaytime: playtimeInSeconds,
            pipesPassed: (existingStats.pipesPassed || 0) + score,
        });
        setStatsUpdated(true);
    }
  }, [status, score, startTime, user, updateUserStats, statsUpdated]);

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

  // Calcule la rotation de l'oiseau pour un effet visuel.
  const birdRotation = status === 'playing'
    ? Math.max(-30, Math.min(90, birdVelocity * 8))
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
            <div className="absolute inset-x-0 bottom-0 h-28 bg-cover bg-repeat-x" style={{backgroundImage: 'url(/img/flippy-ground.png)', animation: 'scroll-x 10s linear infinite'}} />
            
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-5xl font-bold z-20" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
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
                    transition: status === 'playing' ? 'transform 150ms linear' : 'transform 500ms ease-out',
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

