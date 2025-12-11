
// Ce fichier contient le composant principal pour le jeu du serpent (Snake).
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Home, RotateCcw, Play, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';

// Constantes de configuration du jeu
const GRID_SIZE = 20; // La grille est de 20x20
const TILE_SIZE = 18; // Taille de chaque case en pixels
const GAME_DIMENSION = GRID_SIZE * TILE_SIZE; // Dimension totale de l'aire de jeu
const INITIAL_SPEED = 200; // Vitesse de départ en millisecondes (plus élevé = plus lent)

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

export function SnakeGame() {
  const { t } = useLocale();
  const { user, updateUserStats } = useAuth();
  
  // États pour la logique du jeu
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'over'>('lobby');
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);
  const [score, setScore] = useState(0);
  const [applesEaten, setApplesEaten] = useState(0); // Suivi séparé des pommes
  const [highScore, setHighScore] = useState(0);
  const [time, setTime] = useState(0);
  
  // Références pour les boucles de jeu et le temps
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const timerRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>(0);
  const [statsUpdated, setStatsUpdated] = useState(false);

  const gameImage = PlaceHolderImages.find(img => img.id === 'snake');

  // Crée une nouvelle position pour la nourriture, en s'assurant qu'elle n'est pas sur le serpent
  const createFood = useCallback((snakeBody: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snakeBody.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // Réinitialise le jeu à son état initial
  const resetGame = useCallback(() => {
    const startSnake = [{ x: 10, y: 10 }];
    setSnake(startSnake);
    setFood(createFood(startSnake));
    setDirection('RIGHT');
    setSpeed(INITIAL_SPEED);
    setScore(0);
    setApplesEaten(0);
    setTime(0);
    setStatsUpdated(false);
  }, [createFood]);

  // Démarre une nouvelle partie
  const startGame = useCallback(() => {
    resetGame();
    setGameState('playing');
    startTimeRef.current = Date.now();
  }, [resetGame]);

  // Met fin à la partie
  const endGame = useCallback(() => {
    if (gameState === 'over') return;
    setGameState('over');
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [gameState]);

  // Met à jour les statistiques de l'utilisateur lorsque la partie est terminée
  useEffect(() => {
    if (gameState === 'over' && user && !statsUpdated) {
        const playtimeInSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        updateUserStats('Snake', {
            highScore: score,
            totalPlaytime: playtimeInSeconds,
            applesEaten: applesEaten,
        });
        setStatsUpdated(true);
    }
  }, [gameState, user, score, applesEaten, updateUserStats, statsUpdated]);


  // Charge le meilleur score de l'utilisateur au montage
  useEffect(() => {
    if (user) {
        setHighScore(user.stats.games.Snake.highScore);
    }
  }, [user]);

  // Logique principale du mouvement du serpent
  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
        const newSnake = [...prevSnake];
        const head = { ...newSnake[0] };

        switch (direction) {
            case 'UP': head.y -= 1; break;
            case 'DOWN': head.y += 1; break;
            case 'LEFT': head.x -= 1; break;
            case 'RIGHT': head.x += 1; break;
        }
        
        newSnake.unshift(head);

        // Gère la collision avec la nourriture
        if (head.x === food.x && head.y === food.y) {
            setScore(s => s + 5); // Chaque pomme vaut 5 points
            setApplesEaten(a => a + 1);
            setFood(createFood(newSnake));
            setSpeed(s => Math.max(50, s - 2)); // Augmente la vitesse
        } else {
            newSnake.pop(); // Ne grandit pas si aucune nourriture n'est mangée
        }

        return newSnake;
    });
  }, [direction, food, createFood]);

  // Vérifie les collisions (murs et auto-collision)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const head = snake[0];
    if (!head) return;

    // Collision avec les murs
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        endGame();
        return;
    }

    // Auto-collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            endGame();
            return;
        }
    }
  }, [snake, gameState, endGame]);

  // Boucle de jeu principale et minuteur
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(moveSnake, speed);
      
      timerRef.current = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);

      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameState, moveSnake, speed, endGame]);

  // Gère les changements de direction du serpent
  const handleDirectionChange = (newDirection: Direction) => {
    const isOpposite = (dir1: Direction, dir2: Direction) => {
      return (dir1 === 'UP' && dir2 === 'DOWN') ||
             (dir1 === 'DOWN' && dir2 === 'UP') ||
             (dir1 === 'LEFT' && dir2 === 'RIGHT') ||
             (dir1 === 'RIGHT' && dir2 === 'LEFT');
    };
    if (!isOpposite(direction, newDirection)) {
      setDirection(newDirection);
    }
  }

  // Gère les entrées clavier pour le contrôle du serpent
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState !== 'playing') return;
        let newDirection: Direction | null = null;
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
                newDirection = 'UP';
                break;
            case 'ArrowDown':
            case 's':
                newDirection = 'DOWN';
                break;
            case 'ArrowLeft':
            case 'a':
                newDirection = 'LEFT';
                break;
            case 'ArrowRight':
            case 'd':
                newDirection = 'RIGHT';
                break;
        }
        if (newDirection) {
            e.preventDefault();
            handleDirectionChange(newDirection);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, direction]);

  // Rendu pour l'écran d'accueil du jeu
  if (gameState === 'lobby') {
    return (
      <div className="container flex flex-col items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md text-center shadow-lg transition-all hover:shadow-xl">
          {gameImage && (
            <CardHeader className="relative h-48 w-full">
              <Image 
                src={gameImage.imageUrl} 
                alt={t('snake')} 
                fill
                className="rounded-t-lg object-cover"
                data-ai-hint={gameImage.imageHint}
              />
            </CardHeader>
          )}
          <CardContent className="p-6">
            <CardTitle className="text-3xl font-headline">{t('snake')}</CardTitle>
            <CardDescription className="text-lg mt-2 mb-6">{t('snakeInstruction')}</CardDescription>
            <div className="flex flex-col gap-4">
              <Button onClick={startGame} size="lg">
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
  
  // Rendu pour l'écran de fin de partie
  if (gameState === 'over') {
    return (
        <div className="container flex flex-col items-center justify-center min-h-screen py-8">
             <Card className="w-full max-w-sm animate-in fade-in-500 duration-500 text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-destructive font-headline">{t('gameOver')}</CardTitle>
                    <CardDescription className="text-lg">{t('yourScore')}: <span className="font-bold">{score}</span></CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-md text-muted-foreground">{t('highScore')}: <span className="font-bold">{highScore}</span></p>
                </CardContent>
                <CardContent className="flex flex-col gap-4">
                    <Button onClick={startGame} size="lg">
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

  // Formatage du temps pour l'affichage
  const minutes = Math.floor(time / 60).toString().padStart(2, '0');
  const seconds = (time % 60).toString().padStart(2, '0');

  // Rendu principal du jeu en cours
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-8 bg-gray-100 dark:bg-gray-900">
        <div className="text-center mb-4">
            <h1 className="text-4xl font-bold font-headline">{t('snake')}</h1>
            <div className="flex gap-8 text-2xl mt-2">
                <p>{t('score')}: <span className="font-bold">{score}</span></p>
                <p>{t('time')}: <span className="font-mono">{minutes}:{seconds}</span></p>
            </div>
        </div>
        <div 
            className="relative bg-gray-200 dark:bg-gray-800 border-4 border-gray-800 rounded-lg shadow-2xl"
            style={{ width: GAME_DIMENSION, height: GAME_DIMENSION }}
        >
            {snake.map((segment, index) => (
                <div
                    key={index}
                    className={`absolute rounded-sm transition-all duration-75 ${index === 0 ? 'bg-green-700 dark:bg-green-500' : 'bg-green-500 dark:bg-green-400'}`}
                    style={{
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                        left: segment.x * TILE_SIZE,
                        top: segment.y * TILE_SIZE,
                    }}
                />
            ))}
            <div
                className="absolute bg-red-500 rounded-full"
                style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    left: food.x * TILE_SIZE,
                    top: food.y * TILE_SIZE,
                }}
            />
        </div>
        <div className="mt-6 md:hidden">
            <div className="flex justify-center mb-2">
                <Button size="lg" className="w-20 h-20" onClick={() => handleDirectionChange('UP')}><ArrowUp size={40} /></Button>
            </div>
            <div className="flex justify-center gap-2">
                <Button size="lg" className="w-20 h-20" onClick={() => handleDirectionChange('LEFT')}><ArrowLeft size={40} /></Button>
                <Button size="lg" className="w-20 h-20" onClick={() => handleDirectionChange('DOWN')}><ArrowDown size={40} /></Button>
                <Button size="lg" className="w-20 h-20" onClick={() => handleDirectionChange('RIGHT')}><ArrowRight size={40} /></Button>
            </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground hidden md:block">{t('snakeInstruction')}</p>
    </div>
  );
}
