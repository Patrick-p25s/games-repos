
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check, Loader2, Play, Home, X, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback, useReducer } from "react";
import { useLocale } from "@/contexts/locale-context";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { staticQuizData, type QuizQuestion } from '@/lib/static-quiz-data';

type QuizStatus = "lobby" | "loading" | "playing" | "finished";

// ShadCN UI is missing a Label component for the RadioGroup, so we define a simple one here.
const Label = ({ htmlFor, className, children }: {htmlFor: string; className: string; children: React.ReactNode}) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
)

// Using a reducer helps manage complex state transitions more reliably.
type QuizState = {
  status: QuizStatus;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  selectedAnswer: number | null;
  userAnswers: (number | null)[];
  score: number;
  startTime: number;
  statsUpdated: boolean;
};

// All state is reset here to ensure a clean start for every new game.
const initialState: QuizState = {
  status: 'lobby',
  questions: [],
  currentQuestionIndex: 0,
  selectedAnswer: null,
  userAnswers: [],
  score: 0,
  startTime: 0,
  statsUpdated: false,
};

type QuizAction =
  | { type: 'START_LOADING' }
  | { type: 'START_QUIZ'; payload: { questions: QuizQuestion[] } }
  | { type: 'SELECT_ANSWER'; payload: { answerIndex: number } }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FINISH_QUIZ' }
  | { type: 'STATS_UPDATED' }
  | { type: 'RESTART' };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'START_LOADING':
      return { ...initialState, status: 'loading' };
    case 'START_QUIZ':
      return {
        ...state,
        status: 'playing',
        questions: action.payload.questions,
        startTime: Date.now(),
      };
    case 'SELECT_ANSWER':
      return { ...state, selectedAnswer: action.payload.answerIndex };
    case 'NEXT_QUESTION': {
      const isCorrect = state.selectedAnswer === state.questions[state.currentQuestionIndex].correctAnswerIndex;
      const newAnswers = [...state.userAnswers];
      newAnswers[state.currentQuestionIndex] = state.selectedAnswer;

      return {
        ...state,
        score: isCorrect ? state.score + 1 : state.score,
        userAnswers: newAnswers,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        selectedAnswer: null,
      };
    }
    case 'FINISH_QUIZ': {
      const isCorrect = state.selectedAnswer === state.questions[state.currentQuestionIndex].correctAnswerIndex;
      const newAnswers = [...state.userAnswers];
      newAnswers[state.currentQuestionIndex] = state.selectedAnswer;
        
      return {
        ...state,
        status: 'finished',
        score: isCorrect ? state.score + 1 : state.score,
        userAnswers: newAnswers,
      };
    }
    case 'STATS_UPDATED':
      return { ...state, statsUpdated: true };
    case 'RESTART':
      return { ...initialState, status: 'lobby' };
    default:
      return state;
  }
}

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
    return [...array].sort(() => Math.random() - 0.5);
}

export function QuizClient() {
  const { t, language } = useLocale();
  const { user, updateUserStats } = useAuth();
  const [state, dispatch] = useReducer(quizReducer, initialState);
  const { status, questions, currentQuestionIndex, selectedAnswer, userAnswers, score, startTime, statsUpdated } = state;
  
  const gameImage = PlaceHolderImages.find(img => img.id === 'quiz');
  const { toast } = useToast();

  // This function now loads questions from the static data file based on language.
  const loadQuiz = useCallback(async () => {
    dispatch({ type: 'START_LOADING' });

    // Simulate a brief loading period for a better user experience.
    setTimeout(() => {
      const languageQuestions = staticQuizData[language];
      const shuffledQuestions = shuffleArray(languageQuestions).slice(0, 15);
      dispatch({ type: 'START_QUIZ', payload: { questions: shuffledQuestions }});
    }, 500);

  }, [language]);

  const handleNextQuestion = () => {
    if (selectedAnswer === null) {
      toast({
        variant: "destructive",
        title: t('noAnswerSelected'),
        description: t('pleaseChooseAnswer'),
      });
      return;
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      dispatch({ type: 'NEXT_QUESTION' });
    } else {
      dispatch({ type: 'FINISH_QUIZ' });
    }
  };
  
  // This effect runs once when the game is finished to update the user's stats.
  useEffect(() => {
    if (status === 'finished' && user && questions.length > 0 && !statsUpdated) {
        const playtimeInSeconds = startTime > 0 ? Math.round((Date.now() - startTime) / 1000) : 0;
        const existingStats = user.stats.games.Quiz;
        const totalCorrect = (existingStats.totalCorrect || 0) + score;
        const totalQuestions = (existingStats.totalQuestions || 0) + questions.length;
        const newAvgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        updateUserStats('Quiz', {
            gamesPlayed: existingStats.gamesPlayed + 1,
            highScore: Math.max(existingStats.highScore, score),
            totalPlaytime: existingStats.totalPlaytime + playtimeInSeconds,
            avgAccuracy: newAvgAccuracy,
            totalCorrect,
            totalQuestions,
        });
        dispatch({ type: 'STATS_UPDATED' });
    }
  }, [status, questions, score, startTime, statsUpdated, user, updateUserStats]);

  // Render the lobby screen.
  if (status === "lobby") {
    return (
      <div className="container flex flex-col items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md text-center shadow-lg">
          {gameImage && (
            <CardHeader className="relative h-48 w-full">
              <Image 
                src={gameImage.imageUrl} 
                alt={t('quiz')} 
                fill
                className="rounded-t-lg object-cover"
                data-ai-hint={gameImage.imageHint}
              />
            </CardHeader>
          )}
          <CardContent className="p-6">
            <CardTitle className="text-3xl font-headline">{t('quiz')}</CardTitle>
            <CardDescription className="text-lg mt-2 mb-6">{t('quizInstruction')}</CardDescription>
            <div className="flex flex-col gap-4">
              <Button onClick={loadQuiz} size="lg">
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

  // Render a loading spinner while shuffling questions.
  if (status === "loading") {
    return (
      <div className="container py-12 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('generatingQuiz')}</p>
        </div>
      </div>
    );
  }

  // Render the results screen when the quiz is finished.
  if (status === "finished") {
    return (
        <div className="container py-12 flex justify-center">
            <Card className="w-full max-w-3xl text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">{t('quizComplete')}</CardTitle>
                    <CardDescription>{t('youScored')}</CardDescription>
                    <p className="text-5xl font-bold text-primary">{score} / {questions.length}</p>
                </CardHeader>
                <CardContent>
                    <h3 className="text-xl font-bold mb-4">{t('yourAnswers')}</h3>
                    <div className="space-y-4 text-left max-h-96 overflow-y-auto p-2">
                        {questions.map((q, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-muted/50">
                                <p className="font-semibold">{index + 1}. {q.question}</p>
                                <p className={cn("flex items-center mt-2", userAnswers[index] === q.correctAnswerIndex ? 'text-green-600' : 'text-red-600')}>
                                    {userAnswers[index] === q.correctAnswerIndex ? <Check className="h-5 w-5 mr-2" /> : <X className="h-5 w-5 mr-2" />}
                                    {t('yourAnswer')}: {userAnswers[index] !== null ? q.options[userAnswers[index]!] : 'N/A'}
                                </p>
                                {userAnswers[index] !== q.correctAnswerIndex && (
                                    <p className="flex items-center mt-1 text-green-600">
                                        <Check className="h-5 w-5 mr-2" />
                                        {t('correctAnswer')}: {q.options[q.correctAnswerIndex]}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="flex-col sm:flex-row justify-center gap-4">
                    <Button size="lg" onClick={loadQuiz}>
                        <RotateCcw className="mr-2 h-5 w-5" />
                        {t('playAgain')}
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                        <Link href="/">
                            <Home className="mr-2 h-5 w-5" />
                            {t('backToHome')}
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
  }

  // Render the main quiz playing screen.
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="container py-12 flex justify-center">
      <div className="w-full max-w-3xl">
        <div className="mb-4 text-center">
            <p className="text-sm text-muted-foreground">{t('question')} {currentQuestionIndex + 1} {t('of')} {questions.length}</p>
            <Progress value={progress} className="mt-2" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedAnswer !== null ? String(selectedAnswer) : ""}
              onValueChange={(val) => dispatch({ type: 'SELECT_ANSWER', payload: { answerIndex: Number(val) }})}
              className="space-y-4"
            >
              {currentQuestion.options.map((option, index) => (
                <Label
                  key={index}
                  htmlFor={`option-${index}`}
                  className={cn(
                    "flex items-center p-4 border rounded-lg cursor-pointer transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    selectedAnswer === index && "bg-primary text-primary-foreground border-primary"
                  )}
                >
                  <RadioGroupItem value={String(index)} id={`option-${index}`} className="mr-4" />
                  <span className="text-base font-medium">{option}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button size="lg" onClick={handleNextQuestion}>
              {currentQuestionIndex < questions.length - 1 ? t('nextQuestion') : t('finishQuiz')}
              <Play className="ml-2 h-5 w-5" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

    