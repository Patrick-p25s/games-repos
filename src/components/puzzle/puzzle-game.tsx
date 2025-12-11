
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Home, RotateCcw, Play } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';

const GRID_SIZE = 4;
const TILE_SIZE = 80;
const GAME_DIMENSION = TILE_SIZE * GRID_SIZE;

type Tile = number | null;
type Grid = Tile[][];
type Position = { row: number; col: number };

// A 4x4 puzzle's solvability depends on the number of inversions and the row of the empty tile.
const isSolvable = (tiles: Tile[], emptyTileRow: number) => {
  let inversions = 0;
  const flatTiles = tiles.filter(t => t !== null) as number[];
  for (let i = 0; i < flatTiles.length - 1; i++) {
    for (let j = i + 1; j < flatTiles.length; j++) {
      if (flatTiles[i] > flatTiles[j]) {
        inversions++;
      }
    }
  }

  // For a 4x4 grid (even size):
  // If the blank is on an even row counting from the bottom (1-indexed), the number of inversions must be odd.
  // If the blank is on an odd row counting from the bottom (1-indexed), the number of inversions must be even.
  const emptyRowFromBottom = GRID_SIZE - emptyTileRow;
  if (emptyRowFromBottom % 2 === 0) { // Even row from bottom
    return inversions % 2 !== 0;
  } else { // Odd row from bottom
    return inversions % 2 === 0;
  }
};

const createGrid = (): {grid: Grid, emptyPos: Position} => {
    let tiles: Tile[];
    let emptyTileRow: number;
    do {
      tiles = Array.from({ length: GRID_SIZE * GRID_SIZE - 1 }, (_, i) => i + 1);
      tiles.push(null); // The empty tile
      
      // Fisher-Yates shuffle
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
      }
      const emptyIndex = tiles.indexOf(null);
      emptyTileRow = Math.floor(emptyIndex / GRID_SIZE);

    } while (!isSolvable(tiles, emptyTileRow));
    
    const grid: Grid = [];
    for (let i = 0; i < GRID_SIZE; i++) {
        grid.push(tiles.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE));
    }

    const emptyIndex = tiles.indexOf(null);
    const emptyPos = {
        row: Math.floor(emptyIndex / GRID_SIZE),
        col: emptyIndex % GRID_SIZE,
    };
    return { grid, emptyPos };
};

const isSolved = (grid: Grid): boolean => {
    const flatGrid = grid.flat();
    for (let i = 0; i < flatGrid.length - 1; i++) {
        if (flatGrid[i] !== i + 1) return false;
    }
    return flatGrid[flatGrid.length - 1] === null;
};


export function PuzzleGame() {
  const { t } = useLocale();
  const { user, updateUserStats } = useAuth();
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'over'>('lobby');
  const [grid, setGrid] = useState<Grid>([]);
  const [emptyPos, setEmptyPos] = useState<Position>({ row: 0, col: 0 });
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [score, setScore] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const gameImage = useMemo(() => PlaceHolderImages.find(img => img.id === 'puzzle'), []);
  const startTimeRef = useRef<number>(0);


  const endGame = useCallback((won: boolean) => {
    setGameState('over');
    setIsWon(won);
    if (timerRef.current) clearInterval(timerRef.current);
    const finalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
    const calculatedScore = won ? Math.max(0, 10000 - (moves * 10) - finalTime) : 0;
    setScore(calculatedScore);
  }, [moves]);

  useEffect(() => {
    if (gameState === 'over' && user) {
        const playtimeInSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        const existingStats = user.stats.games.Puzzle;
        const newBestTime = isWon && (existingStats.bestTime === 0 || playtimeInSeconds < existingStats.bestTime) ? playtimeInSeconds : existingStats.bestTime;
        
        updateUserStats('Puzzle', {
            highScore: score,
            totalPlaytime: playtimeInSeconds,
            bestTime: newBestTime,
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  useEffect(() => {
    const { grid: newGrid, emptyPos: newEmptyPos } = createGrid();
    setGrid(newGrid);
    setEmptyPos(newEmptyPos);
  }, []);

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

  const startGame = useCallback(() => {
    const { grid: newGrid, emptyPos: newEmptyPos } = createGrid();
    setGrid(newGrid);
    setEmptyPos(newEmptyPos);
    setMoves(0);
    setTime(0);
    setScore(0);
    setIsWon(false);
    setGameState('playing');
    startTimeRef.current = Date.now();
  }, []);

  const handleTileClick = (row: number, col: number) => {
    if (gameState !== 'playing' || grid[row][col] === null) return;

    const { row: emptyRow, col: emptyCol } = emptyPos;
    
    if ((Math.abs(row - emptyRow) === 1 && col === emptyCol) || (Math.abs(col - emptyCol) === 1 && row === emptyRow)) {
      const newGrid = grid.map(r => [...r]);
      [newGrid[row][col], newGrid[emptyRow][emptyCol]] = [newGrid[emptyRow][emptyCol], newGrid[row][col]];
      
      setGrid(newGrid);
      setEmptyPos({ row, col });
      setMoves(prevMoves => prevMoves + 1);

      if (isSolved(newGrid)) {
        endGame(true);
      }
    }
  };
  
  if (gameState === 'lobby') {
    return (
      <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-8">
        <Card className="w-full max-w-md text-center shadow-lg">
          {gameImage && (
            <CardHeader className="relative h-48 w-full">
              <Image 
                src={gameImage.imageUrl} 
                alt={t('puzzle')} 
                layout="fill" 
                className="rounded-t-lg object-cover"
                data-ai-hint={gameImage.imageHint}
              />
            </CardHeader>
          )}
          <CardContent className="p-6">
            <CardTitle className="text-3xl font-headline">{t('puzzle')}</CardTitle>
            <CardDescription className="text-lg mt-2 mb-6">{t('puzzleInstruction')}</CardDescription>
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
                        <CardTitle className="text-3xl font-bold text-primary font-headline">{t('puzzleComplete')}</CardTitle>
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
            <h1 className="text-4xl font-bold font-headline">{t('puzzle')}</h1>
            <div className="flex gap-8 mt-2 text-lg">
                <p>{t('moves')}: <span className="font-bold">{moves}</span></p>
                <p>{t('time')}: <span className="font-bold tabular-nums">{minutes}:{seconds}</span></p>
            </div>
        </div>
        <div 
            className="relative grid bg-gray-200 dark:bg-gray-800 border-4 border-gray-800 rounded-lg shadow-2xl overflow-hidden"
            style={{ 
                width: GAME_DIMENSION, 
                height: GAME_DIMENSION,
            }}
        >
            {gameImage && (
                <Image
                    src={gameImage.imageUrl}
                    alt="Puzzle background"
                    width={GAME_DIMENSION}
                    height={GAME_DIMENSION}
                    className="absolute inset-0 object-cover opacity-20"
                />
            )}
            {grid.map((row, r) =>
                row.map((tile, c) => {
                    const top = (tile ? (Math.floor((tile-1) / GRID_SIZE)) : GRID_SIZE-1) * TILE_SIZE;
                    const left = (tile ? ((tile-1) % GRID_SIZE) : GRID_SIZE-1) * TILE_SIZE;
                    const tileTop = r * TILE_SIZE;
                    const tileLeft = c * TILE_SIZE;

                    return (
                        <div
                            key={tile ?? 'empty'}
                            onClick={() => handleTileClick(r, c)}
                            className={cn(
                                "absolute flex items-center justify-center text-3xl font-bold text-white border border-background select-none transition-all duration-300 ease-in-out",
                                tile === null ? 'bg-transparent border-none' : 'bg-primary/70 cursor-pointer hover:scale-105 hover:z-10',
                            )}
                            style={{
                                width: TILE_SIZE,
                                height: TILE_SIZE,
                                top: `${tileTop}px`,
                                left: `${tileLeft}px`,
                                backgroundImage: tile && gameImage ? `url(${gameImage.imageUrl})` : 'none',
                                backgroundSize: `${GAME_DIMENSION}px ${GAME_DIMENSION}px`,
                                backgroundPosition: `-${left}px -${top}px`,
                                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
                            }}
                        >
                            {tile}
                        </div>
                    );
                })
            )}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t('puzzleInstruction')}</p>
    </div>
  );
}
