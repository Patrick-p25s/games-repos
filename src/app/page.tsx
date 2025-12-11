// La page d'accueil de l'application, présentant la liste des jeux disponibles.
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  Bird,
  BrainCircuit,
  BrainCog,
  Puzzle,
  Blocks,
  Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";

// Définit la structure d'un objet jeu.
type Game = {
  name: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

// Liste des jeux disponibles dans l'application.
const games: Game[] = [
  { name: "Puzzle", href: "/puzzle/play", icon: Puzzle, description: "puzzleDescription" },
  { name: "Tetris", href: "/tetris/play", icon: Blocks, description: "tetrisDescription" },
  { name: "Flippy Bird", href: "/flippy-bird/play", icon: Bird, description: "flippyBirdDescription" },
  { name: "Memory", href: "/memory/play", icon: BrainCircuit, description: "memoryDescription" },
  { name: "Snake", href: "/snake/play", icon: Bot, description: "snakeDescription" },
  { name: "Quiz", href: "/quiz/play", icon: BrainCog, description: "quizDescription" },
];

export default function Home() {
    const { t } = useLocale();

  return (
    <div className="container py-12">
      <div className="text-left mb-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter font-headline mb-4">
          {t('welcomeTitle')}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          {t('welcomeSubtitle')}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {games.map((game) => {
          const gameKey = game.name.toLowerCase().replace(' ', '');
          return (
            <Link href={game.href} key={game.name} className="group">
              <Card className="h-full flex flex-col transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl dark:group-hover:shadow-primary/20 group-hover:border-primary">
                <CardHeader className="flex-row items-center justify-center p-6">
                    <game.icon className="h-10 w-10 text-primary" />
                </CardHeader>
                <CardContent className="flex flex-col items-center text-center p-6 pt-0 flex-grow">
                    <CardTitle className="text-2xl font-bold font-headline mb-2">
                      {t(gameKey)}
                    </CardTitle>
                    <CardDescription>{t(game.description)}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
