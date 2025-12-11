
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Home, RotateCcw, Gamepad2, Star, Trophy, Play } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';
import {
    Bird,
    BrainCog,
    Puzzle,
    Blocks,
    Bot,
} from "lucide-react";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';

const icons = [Bird, BrainCog, Puzzle, Blocks, Bot, Gamepad2, Star, Trophy];
const GRID_SIZE = 4; // 4x4 grid
const CARD_COUNT = GRID_SIZE * GRID_SIZE;
const PAIRS_COUNT = CARD_COUNT / 2;

type CardState = {
    id: number;
    icon: React.ElementType;
    isFlipped: boolean;
    isMatched: boolean;
};

const shuffleArray = (array: any[]) => {
    return array.sort(() => Math.random() - 0.5);
};

export function MemoryGame() {
  const { t } = useLocale();
  const { user, updateUserStats } = useAuth();
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'over'>('lobby');
  const [cards, setCards] = useState<CardState[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [score, setScore] = useState(0);
  const [statsUpdated, setStatsUpdated] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameImage = PlaceHolderImages.find(img => img.id === 'memory');
  const startTimeRef = useRef<number>(0);


  const generateCards = useCallback(() => {
    const selectedIcons = icons.slice(0, PAIRS_COUNT);
    const cardPairs = [...selectedIcons, ...selectedIcons];
    const shuffledCards = shuffleArray(cardPairs);
    return shuffledCards.map((Icon, index) => ({
      id: index,
      icon: Icon,
      isFlipped: false,
      isMatched: false,
    }));
  }, []);
  
  const endGame = useCallback((won: boolean) => {
    setIsWon(won);
    setGameState('over');
    if (timerRef.current) clearInterval(timerRef.current);
    const finalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
    const calculatedScore = won ? Math.max(0, 10000 - (moves * 10) - finalTime) : 0;
    setScore(calculatedScore);
  }, [moves]);
  
  useEffect(() => {
    if (gameState === 'over' && !statsUpdated && user) {
        const playtimeInSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        const existingStats = user.stats.games.Memory;
        const newBestTime = isWon && (existingStats.bestTime === 0 || playtimeInSeconds < existingStats.bestTime) ? playtimeInSeconds : existingStats.bestTime;
        
        updateUserStats('Memory', {
            highScore: score,
            totalPlaytime: playtimeInSeconds,
            bestTime: newBestTime,
        });
        setStatsUpdated(true);
    }
  }, [gameState, score, isWon, user, statsUpdated, updateUserStats]);

  useEffect(() => {
    setCards(generateCards());
  },[generateCards])

  const startGame = useCallback(() => {
    setCards(generateCards());
    setFlippedCards([]);
    setMoves(0);
    setTime(0);
    setScore(0);
    setIsWon(false);
    setStatsUpdated(false);
    setGameState('playing');
    startTimeRef.current = Date.now();
  }, [generateCards]);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameState]);

  const handleCardClick = (id: number) => {
    if (gameState !== 'playing' || flippedCards.length === 2) return;
    
    const clickedCard = cards.find(card => card.id === id);
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched) return;

    const newFlippedCards = [...flippedCards, id];
    setFlippedCards(newFlippedCards);

    const newCards = cards.map(card => card.id === id ? { ...card, isFlipped: true } : card);
    setCards(newCards);

    if (newFlippedCards.length === 2) {
      setMoves(m => m + 1);
      const [firstId, secondId] = newFlippedCards;
      const firstCard = newCards.find(c => c.id === firstId);
      const secondCard = newCards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.icon === secondCard.icon) {
        // Matched
        const matchedCards = newCards.map(card => 
          card.id === firstId || card.id === secondId ? { ...card, isMatched: true } : card
        );
        setCards(matchedCards);
        setFlippedCards([]);

        if (matchedCards.every(c => c.isMatched)) {
            endGame(true);
        }

      } else {
        // Not matched
        timeoutRef.current = setTimeout(() => {
          const resetCards = newCards.map(card => 
            card.id === firstId || card.id === secondId ? { ...card, isFlipped: false } : card
          );
          setCards(resetCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };
  
  useEffect(() => {
    return () => {
        if(timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, []);

  if (gameState === 'lobby') {
    return (
      <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-8">
        <Card className="w-full max-w-md text-center shadow-lg">
          {gameImage && (
            <CardHeader className="relative h-48 w-full">
              <Image 
                src={gameImage.imageUrl} 
                alt={t('memory')} 
                layout="fill" 
                className="rounded-t-lg object-cover"
                data-ai-hint={gameImage.imageHint}
              />
            </CardHeader>
          )}
          <CardContent className="p-6">
            <CardTitle className="text-3xl font-headline">{t('memory')}</CardTitle>
            <CardDescription className="text-lg mt-2 mb-6">{t('memoryInstruction')}</CardDescription>
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
        <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-8">
             <Card className="w-full max-w-sm animate-in fade-in-500 duration-500 text-center">
                <CardHeader>
                    {isWon ? (
                        <CardTitle className="text-3xl font-bold text-primary font-headline">{t('congratulations')}</CardTitle>
                    ) : (
                        <CardTitle className="text-3xl font-bold text-red-500 font-headline">{t('gameOver')}</CardTitle>
                    )}
                    <CardDescription className="text-lg">
                        {isWon ? `${t('youWonIn')} ${moves} ${t('moves')}!` : t('timeIsUp')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-md text-gray-600 dark:text-gray-400">{t('timeTaken')}: <span className="font-bold">{time}s</span></p>
                    {isWon && <p className="text-lg font-semibold">{t('score')}: {score}</p>}
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

  const minutes = Math.floor(time / 60).toString().padStart(2, '0');
  const seconds = (time % 60).toString().padStart(2, '0');

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-8 bg-gray-100 dark:bg-gray-900">
        <div className="text-center mb-4">
            <h1 className="text-4xl font-bold font-headline">{t('memory')}</h1>
            <div className="flex gap-8 mt-2 text-lg">
                <p>{t('moves')}: <span className="font-bold">{moves}</span></p>
                <p>{t('time')}: <span className="font-bold tabular-nums">{minutes}:{seconds}</span></p>
            </div>
        </div>
        <div 
            className="grid gap-4"
            style={{ 
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                width: GRID_SIZE * 90
            }}
        >
            {cards.map(card => (
                <div key={card.id} className="w-20 h-20 perspective-1000" onClick={() => handleCardClick(card.id)}>
                   <div 
                        className={cn("relative w-full h-full transform-style-3d transition-transform duration-500",
                        card.isFlipped || card.isMatched ? 'rotate-y-180' : ''
                        )}
                    >
                        <div className="absolute w-full h-full backface-hidden flex items-center justify-center bg-secondary rounded-lg cursor-pointer">
                            <BrainCog className="w-10 h-10 text-secondary-foreground"/>
                        </div>
                        <div className={cn(
                          "absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center rounded-lg",
                          card.isMatched ? 'bg-green-500' : 'bg-primary',
                          'text-primary-foreground'
                          )}>
                            <card.icon className="w-10 h-10" />
                        </div>
                   </div>
                </div>
            ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t('memoryInstruction')}</p>
    </div>
  );
}
