
// Ce fichier contient le composant principal du jeu Tetris.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Home, RotateCcw, Play, ArrowLeft, ArrowRight, ArrowDown, ChevronsDown, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

// Constantes du jeu Tetris.
const COLS = 10; // Nombre de colonnes de la grille.
const ROWS = 20; // Nombre de lignes de la grille.
const BLOCK_SIZE = 25; // Taille de chaque bloc en pixels, ajustée pour les mobiles.

// Définition des formes des tétrominos et de leurs couleurs.
const TETROMINOS = {
  'I': { shape: [[1, 1, 1, 1]], color: 'bg-cyan-500 border-cyan-300' },
  'J': { shape: [[0, 1, 0], [0, 1, 0], [1, 1, 0]], color: 'bg-blue-600 border-blue-400' },
  'L': { shape: [[0, 1, 0], [0, 1, 0], [0, 1, 1]], color: 'bg-orange-500 border-orange-300' },
  'O': { shape: [[1, 1], [1, 1]], color: 'bg-yellow-500 border-yellow-300' },
  'S': { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-green-500 border-green-300' },
  'T': { shape: [[1, 1, 1], [0, 1, 0]], color: 'bg-purple-600 border-purple-400' },
  'Z': { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-red-600 border-red-400' },
};


type TetrominoKey = keyof typeof TETROMINOS;

type Cell = {
    filled: boolean;
    color: string;
}
type Board = Cell[][];

// Crée un tableau de jeu vide.
const createEmptyBoard = (): Board => Array.from({ length: ROWS }, () => Array(COLS).fill({ filled: false, color: '' }));

export function TetrisGame() {
  const { t } = useLocale();
  const { user, updateUserStats } = useAuth();
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'over'>('lobby');
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesCleared, setLinesCleared] = useState(0);
  const [time, setTime] = useState(0);
  const gameImage = PlaceHolderImages.find(img => img.id === 'tetris');
  const startTimeRef = useRef<number>(0);


  const [activePiece, setActivePiece] = useState({
      pos: { x: 0, y: 0 },
      tetromino: TETROMINOS['I'],
      shape: TETROMINOS['I'].shape,
  });
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const timerRef = useRef<NodeJS.Timeout>();

  // Sélectionne un tétromino au hasard.
  const randomTetromino = useCallback((): { shape: number[][], color: string } => {
    const keys = Object.keys(TETROMINOS) as TetrominoKey[];
    const randKey = keys[Math.floor(Math.random() * keys.length)];
    return TETROMINOS[randKey];
  }, []);

  // Met fin à la partie.
  const endGame = useCallback(() => {
    if(gameState === 'over') return;
    setGameState('over');
    if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [gameState]);

  // Met à jour les statistiques du joueur à la fin de la partie.
  useEffect(() => {
    if (gameState === 'over' && user) {
        const playtimeInSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        updateUserStats('Tetris', {
            highScore: score,
            totalPlaytime: playtimeInSeconds,
            linesCleared: linesCleared,
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Réinitialise l'état du jeu pour une nouvelle partie.
  const resetGame = useCallback(() => {
    const newPieceTetromino = randomTetromino();
    setActivePiece({
        pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
        tetromino: newPieceTetromino,
        shape: newPieceTetromino.shape,
    });
    setBoard(createEmptyBoard());
    setScore(0);
    setLevel(1);
    setLinesCleared(0);
    setTime(0);
  }, [randomTetromino]);
  
  useEffect(() => {
    resetGame();
  }, [resetGame])

  // Démarre la partie.
  const startGame = useCallback(() => {
    resetGame();
    setGameState('playing');
    startTimeRef.current = Date.now();
  }, [resetGame]);

  // Vérifie si un mouvement est valide.
  const isValidMove = (shape: number[][], pos: {x: number, y: number}, currentBoard: Board): boolean => {
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const newY = y + pos.y;
                const newX = x + pos.x;
                if (newY >= ROWS || newX < 0 || newX >= COLS || (currentBoard[newY] && currentBoard[newY][newX]?.filled)) {
                    return false;
                }
            }
        }
    }
    return true;
  };
  
  // Fonction de chute de la pièce.
  const drop = useCallback(() => {
    if (gameState !== 'playing') return;

    setActivePiece(prev => {
      const nextPos = { ...prev.pos, y: prev.pos.y + 1 };
      if (isValidMove(prev.shape, nextPos, board)) {
        return { ...prev, pos: nextPos };
      } else {
        // Verrouille la pièce en place.
        const newBoard = board.map(row => row.map(cell => ({...cell})));
        let gameOver = false;
        prev.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const boardY = prev.pos.y + y;
                    const boardX = prev.pos.x + x;
                    if(boardY < ROWS && boardX < COLS && boardY >= 0 && boardX >= 0) {
                        newBoard[boardY][boardX] = { filled: true, color: prev.tetromino.color };
                    }
                    if (boardY < 0) { // La pièce est verrouillée au-dessus du tableau.
                        gameOver = true;
                    }
                }
            });
        });

        if (gameOver) {
            endGame();
            return prev;
        }

        // Vérifie et efface les lignes complétées.
        let clearedRowCount = 0;
        let tempBoard = [...newBoard];
        for (let y = tempBoard.length - 1; y >= 0; y--) {
            if (tempBoard[y].every(cell => cell.filled)) {
                tempBoard.splice(y, 1);
                tempBoard.unshift(Array(COLS).fill({ filled: false, color: '' }));
                clearedRowCount++;
                y++; // Re-check the same row index since it's now a new row.
            }
        }

        if (clearedRowCount > 0) {
            setBoard(tempBoard);
            setScore(s => s + [0, 100, 300, 500, 800][clearedRowCount] * level);
            setLinesCleared(l => l + clearedRowCount);
        } else {
            setBoard(newBoard);
        }
        
        // Génère une nouvelle pièce.
        const newPieceTetromino = randomTetromino();
        const newPiece = {
            pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
            tetromino: newPieceTetromino,
            shape: newPieceTetromino.shape,
        };

        if (!isValidMove(newPiece.shape, newPiece.pos, tempBoard)) {
            endGame();
            return prev;
        } else {
            return newPiece;
        }
      }
    });
  }, [board, endGame, level, randomTetromino, gameState]);

  // Augmente le niveau toutes les 10 lignes effacées.
  useEffect(() => {
    if(linesCleared > 0 && linesCleared % 10 === 0) {
        setLevel(l => l + 1);
    }
  }, [linesCleared])

  // Gère la boucle de jeu principale et le minuteur.
  useEffect(() => {
    if (gameState === 'playing') {
      const gameSpeed = Math.max(100, 1000 - (level - 1) * 50);
      gameLoopRef.current = setInterval(drop, gameSpeed);
      
      timerRef.current = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);

      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameState, drop, level]);

  // Déplace la pièce horizontalement.
  const move = (dir: -1 | 1) => {
    if (gameState !== 'playing') return;
    setActivePiece(prev => {
        const nextPos = { ...prev.pos, x: prev.pos.x + dir };
        if (isValidMove(prev.shape, nextPos, board)) {
            return { ...prev, pos: nextPos };
        }
        return prev;
    });
  };

  // Fait pivoter la pièce.
  const rotate = () => {
    if (gameState !== 'playing') return;
    setActivePiece(prev => {
        const shape = prev.shape;
        const newShape: number[][] = shape[0].map((_, colIndex) => shape.map(row => row[colIndex]).reverse());
        if (isValidMove(newShape, prev.pos, board)) {
            return { ...prev, shape: newShape };
        }
        return prev;
    });
  };

  // Fait tomber la pièce instantanément (hard drop).
  const hardDrop = () => {
    if (gameState !== 'playing') return;

    // Arrête la boucle de jeu temporairement pour éviter les conflits.
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);

    let nextPiece = { ...activePiece };
    while (isValidMove(nextPiece.shape, { ...nextPiece.pos, y: nextPiece.pos.y + 1}, board)) {
        nextPiece.pos.y += 1;
    }
    
    // Met à jour la position, puis déclenche `drop` manuellement pour verrouiller la pièce et continuer.
    setActivePiece(nextPiece);
    drop();
  };

  // Gère les entrées clavier.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState !== 'playing') return;
        switch (e.key) {
            case 'ArrowLeft': e.preventDefault(); move(-1); break;
            case 'ArrowRight': e.preventDefault(); move(1); break;
            case 'ArrowDown': e.preventDefault(); drop(); break;
            case 'ArrowUp': e.preventDefault(); rotate(); break;
            case ' ': e.preventDefault(); hardDrop(); break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, drop, hardDrop]); // Ajout de hardDrop ici

  // Crée le tableau d'affichage en combinant le tableau de jeu et la pièce active.
  const displayBoard = (): Board => {
    const newBoard = board.map(row => row.map(cell => ({...cell})));
    activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
            const boardY = activePiece.pos.y + y;
            const boardX = activePiece.pos.x + x;
            if (boardY >= 0 && boardY < ROWS && boardX >=0 && boardX < COLS) {
                newBoard[boardY][boardX] = { filled: true, color: activePiece.tetromino.color };
            }
        }
      });
    });
    return newBoard;
  };
  
  // Affiche l'écran d'accueil du jeu.
  if (gameState === 'lobby') {
    return (
      <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-8">
        <Card className="w-full max-w-md text-center shadow-lg">
          {gameImage && (
            <CardHeader className="relative h-48 w-full">
              <Image 
                src={gameImage.imageUrl} 
                alt={t('tetris')} 
                fill
                className="rounded-t-lg object-cover"
                data-ai-hint={gameImage.imageHint}
              />
            </CardHeader>
          )}
          <CardContent className="p-6">
            <CardTitle className="text-3xl font-headline">{t('tetris')}</CardTitle>
            <CardDescription className="text-lg mt-2 mb-6">{t('tetrisInstruction')}</CardDescription>
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

  // Affiche l'écran de fin de partie.
  if (gameState === 'over') {
    return (
        <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-8">
             <Card className="w-full max-w-sm animate-in fade-in-500 duration-500 text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-destructive font-headline">{t('gameOver')}</CardTitle>
                    <CardDescription className="text-lg">{t('yourScore')}: <span className="font-bold">{score}</span></CardDescription>
                </CardHeader>
                <CardContent>
                   <p className="text-md text-muted-foreground">{t('level')}: <span className="font-bold">{level}</span></p>
                   <p className="text-md text-muted-foreground">{t('linesCleared')}: <span className="font-bold">{linesCleared}</span></p>
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
  
  // Formate le temps pour l'affichage.
  const minutes = Math.floor(time / 60).toString().padStart(2, '0');
  const seconds = (time % 60).toString().padStart(2, '0');

  // Affiche l'écran de jeu principal.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 py-8 bg-background text-foreground">
        <div className="w-full max-w-sm text-center">
            <h1 className="text-4xl font-bold font-headline mb-4">{t('tetris')}</h1>
            <div className="grid grid-cols-4 gap-2 p-2 mb-4 rounded-lg bg-muted text-foreground">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t('time')}</p>
                    <p className="font-bold text-lg tabular-nums">{minutes}:{seconds}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t('score')}</p>
                    <p className="font-bold text-lg">{score}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t('level')}</p>
                    <p className="font-bold text-lg">{level}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t('lines')}</p>
                    <p className="font-bold text-lg">{linesCleared}</p>
                </div>
            </div>
        </div>

        <div 
            className="grid rounded-lg shadow-2xl bg-gray-400/20 dark:bg-gray-800/20 backdrop-blur-sm p-1"
            style={{ 
                gridTemplateColumns: `repeat(${COLS}, ${BLOCK_SIZE}px)`,
                gridTemplateRows: `repeat(${ROWS}, ${BLOCK_SIZE}px)`,
                width: COLS * BLOCK_SIZE + 8,
                height: ROWS * BLOCK_SIZE + 8,
            }}
        >
            {displayBoard().map((row, y) => 
                row.map((cell, x) => (
                    <div 
                        key={`${y}-${x}`}
                        className={cn(
                            'rounded-sm',
                            cell.filled ? cell.color : 'bg-transparent',
                            cell.filled && 'border-t-[1px] border-l-[1px] border-white/20 shadow-inner'
                        )}
                    />
                ))
            )}
        </div>
        
        <div className="md:hidden mt-4 flex flex-col items-center justify-center gap-2 p-4 bg-muted/80 backdrop-blur-sm rounded-lg">
            <div className="flex gap-2">
                <Button size="icon" variant="outline" className="w-14 h-14 bg-background/50" onClick={() => rotate()}><RotateCw size={24}/></Button>
                <Button size="icon" variant="outline" className="w-14 h-14 bg-background/50" onClick={() => hardDrop()}><ChevronsDown size={24}/></Button>
            </div>
            <div className="flex gap-2">
                <Button size="icon" variant="outline" className="w-14 h-14 bg-background/50" onClick={() => move(-1)}><ArrowLeft size={24}/></Button>
                <Button size="icon" variant="outline" className="w-14 h-14 bg-background/50" onClick={() => drop()}><ArrowDown size={24}/></Button>
                <Button size="icon" variant="outline" className="w-14 h-14 bg-background/50" onClick={() => move(1)}><ArrowRight size={24}/></Button>
            </div>
        </div>

        <p className="mt-2 text-sm text-muted-foreground hidden md:block">{t('tetrisInstruction')}</p>
    </div>
  );
}
