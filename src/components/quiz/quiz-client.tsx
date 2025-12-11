
"use client";

import { generateQuizQuestions } from "@/ai/flows/generate-quiz-questions";
import type { GenerateQuizQuestionsOutput } from "@/ai/flows/generate-quiz-questions";
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
import { useEffect, useState, useCallback } from "react";
import { useLocale } from "@/contexts/locale-context";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';

type QuizState = "lobby" | "loading" | "playing" | "finished";
type Question = GenerateQuizQuestionsOutput["questions"][0];

// Add a label component to be used with RadioGroup
const Label = ({ htmlFor, className, children }: {htmlFor: string; className: string; children: React.ReactNode}) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
)


export function QuizClient() {
  const { t } = useLocale();
  const { user, updateUserStats } = useAuth();
  const [quizState, setQuizState] = useState<QuizState>("lobby");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [statsUpdated, setStatsUpdated] = useState(false);
  const gameImage = PlaceHolderImages.find(img => img.id === 'quiz');

  const { toast } = useToast();

  const loadQuiz = useCallback(async () => {
    setQuizState("loading");
    setCurrentQuestionIndex(0);
    setScore(0);
    setUserAnswers([]);
    setSelectedAnswer(null);
    setStatsUpdated(false);

    try {
      toast({ title: t('letsTryQuiz'), description: `${t('topic')}: General Knowledge` });

      const quizData = await generateQuizQuestions({
        topic: "General Knowledge",
        difficulty: "easy",
        numQuestions: 10,
      });

      setQuestions(quizData.questions);
      setStartTime(Date.now());
      setQuizState("playing");
    } catch (error) {
      console.error("Failed to load quiz:", error);
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('quizGenerationError'),
      });
      setQuizState("lobby");
    }
  }, [t, toast]);

  const handleNextQuestion = () => {
    if (selectedAnswer === null) {
      toast({
        variant: "destructive",
        title: t('noAnswerSelected'),
        description: t('pleaseChooseAnswer'),
      });
      return;
    }

    const isCorrect = selectedAnswer === questions[currentQuestionIndex].correctAnswerIndex;
    if (isCorrect) {
      setScore(score + 1);
    }

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setUserAnswers(newAnswers);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    } else {
      setQuizState("finished");
    }
  };
  
  useEffect(() => {
    if (quizState === 'finished' && user && questions.length > 0 && !statsUpdated) {
        const playtime = startTime > 0 ? Math.round((Date.now() - startTime) / 60000) : 0;
        const existingStats = user.stats.games.Quiz;
        const totalCorrect = existingStats.totalCorrect + score;
        const totalQuestions = existingStats.totalQuestions + questions.length;
        const newAvgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        updateUserStats('Quiz', {
            gamesPlayed: existingStats.gamesPlayed + 1,
            highScore: Math.max(existingStats.highScore, score),
            totalPlaytime: existingStats.totalPlaytime + playtime,
            avgAccuracy: newAvgAccuracy,
            totalCorrect,
            totalQuestions,
        });
        setStatsUpdated(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizState, questions, score, startTime, statsUpdated, user, updateUserStats]);

  if (quizState === "lobby") {
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

  if (quizState === "loading") {
    return (
      <div className="container py-12 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('generatingQuiz')}</p>
        </div>
      </div>
    );
  }

  if (quizState === "finished") {
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
              onValueChange={(val) => setSelectedAnswer(Number(val))}
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
