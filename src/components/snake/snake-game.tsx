
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

const GRID_SIZE = 20;
const TILE_SIZE = 18; // Reduced from 20
const GAME_DIMENSION = GRID_SIZE * TILE_SIZE;
const INITIAL_SPEED = 200; // Slower start
const GAME_TIME_LIMIT = 90; // 90 seconds

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

export function SnakeGame() {
  const { t } = useLocale();
  const { user, updateUserStats } = useAuth();
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'over'>('lobby');
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME_LIMIT);
  const [statsUpdated, setStatsUpdated] = useState(false);
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const timerRef = useRef<NodeJS.Timeout>();
  const gameImage = PlaceHolderImages.find(img => img.id === 'snake');

  const endGame = useCallback(() => {
    if (gameState === 'over') return;
    setGameState('over');
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'over' && !statsUpdated) {
        if(user) {
            const playtime = startTime > 0 ? Math.min(GAME_TIME_LIMIT, Math.round((Date.now() - startTime) / 1000)) : 0;
            const existingStats = user.stats.games.Snake;
            if (score > existingStats.highScore) {
              setHighScore(score);
            }
            updateUserStats('Snake', {
                gamesPlayed: existingStats.gamesPlayed + 1,
                highScore: Math.max(existingStats.highScore, score),
                totalPlaytime: existingStats.totalPlaytime + Math.round(playtime / 60),
                applesEaten: (existingStats.applesEaten || 0) + (score / 10),
            });
            setStatsUpdated(true);
        }
    }
  }, [gameState, score, user, updateUserStats, startTime, statsUpdated]);


  useEffect(() => {
    if (user) {
        setHighScore(user.stats.games.Snake.highScore);
    }
  }, [user]);

  const createFood = (snakeBody: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snakeBody.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  };

  const resetGame = useCallback(() => {
    const startSnake = [{ x: 10, y: 10 }];
    setSnake(startSnake);
    setFood(createFood(startSnake));
    setDirection('RIGHT');
    setSpeed(INITIAL_SPEED);
    setScore(0);
    setTimeLeft(GAME_TIME_LIMIT);
    setStatsUpdated(false);
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    setStartTime(Date.now());
    setGameState('playing');
  }, [resetGame]);

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

        // Food collision
        if (head.x === food.x && head.y === food.y) {
            setScore(s => s + 10);
            setFood(createFood(newSnake));
            setSpeed(s => Math.max(50, s - 2)); // Slower speed increase
        } else {
            newSnake.pop();
        }

        return newSnake;
    });
  }, [direction, food]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const head = snake[0];
    if (!head) return;

    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        endGame();
        return;
    }

    // Self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            endGame();
            return;
        }
    }
  }, [snake, gameState, endGame]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(moveSnake, speed);
      
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameState, moveSnake, speed, endGame]);


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

  if (gameState === 'lobby') {
    return (
      <div className="container flex flex-col items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md text-center shadow-lg">
          {gameImage && (
            <CardHeader className="relative h-48 w-full">
              <Image 
                src={gameImage.imageUrl} 
                alt={t('snake')} 
                layout="fill" 
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
  
  if (gameState === 'over') {
    return (
        <div className="container flex flex-col items-center justify-center min-h-screen py-8">
             <Card className="w-full max-w-sm animate-in fade-in-500 duration-500 text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-red-500 font-headline">{t('gameOver')}</CardTitle>
                    <CardDescription className="text-lg">{t('yourScore')}: <span className="font-bold">{score}</span></CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-md text-gray-600 dark:text-gray-400">{t('highScore')}: <span className="font-bold">{highScore}</span></p>
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

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-8 bg-gray-100 dark:bg-gray-900">
        <div className="text-center mb-4">
            <h1 className="text-4xl font-bold font-headline">{t('snake')}</h1>
            <div className="flex gap-8 text-2xl mt-2">
                <p>{t('score')}: {score}</p>
                <p>{t('time')}: {minutes}:{seconds.toString().padStart(2, '0')}</p>
            </div>
        </div>
        <div 
            className="relative bg-gray-200 dark:bg-gray-800 border-4 border-gray-800 rounded-lg shadow-2xl"
            style={{ width: GAME_DIMENSION, height: GAME_DIMENSION }}
        >
            {snake.map((segment, index) => (
                <div
                    key={index}
                    className={`absolute rounded-sm ${index === 0 ? 'bg-green-700' : 'bg-green-500'}`}
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
        <p className="mt-4 text-sm text-muted-foreground">{t('snakeInstruction')}</p>
    </div>
  );
}

