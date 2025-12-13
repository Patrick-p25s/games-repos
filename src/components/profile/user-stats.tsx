// Ce fichier affiche les statistiques de jeu détaillées pour l'utilisateur sur sa page de profil.
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Trophy, Clock, Gamepad2, RotateCcw, Star } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";

export function UserStats() {
    const { t } = useLocale();
    const { user, resetStats } = useAuth();
    const { toast } = useToast();

    if (!user || !user.stats) {
        return null;
    }

    const { stats } = user;

    // Formate les secondes en une chaîne de caractères lisible (ex: "HH:MM:SS").
    const formatPlaytime = (seconds: number): string => {
        if (isNaN(seconds) || seconds < 0) return '00:00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // Récupère une statistique de jeu en toute sécurité, en retournant une valeur par défaut si elle n'existe pas.
    const getSafeStat = (game: string, stat: string, defaultValue: string | number = 0) => {
        const gameData = stats.games[game as keyof typeof stats.games];
        if (!gameData || !(stat in gameData) || gameData[stat as keyof typeof gameData] === undefined) {
            return defaultValue;
        }
        return gameData[stat as keyof typeof gameData];
    }
    
    // Convertit le temps de jeu total de secondes en une chaîne lisible.
    const totalPlaytimeFormatted = formatPlaytime(stats.overall.totalPlaytime);

    // Configuration pour l'affichage des statistiques de chaque jeu.
    const gameStatsConfig = [
        { name: "Quiz", stats: [
            { title: "gamesPlayed", value: getSafeStat("Quiz", "gamesPlayed") },
            { title: "highScore", value: (getSafeStat("Quiz", "highScore") as number).toLocaleString() },
            { title: "avgAccuracy", value: `${getSafeStat("Quiz", "avgAccuracy")}%` },
            { title: "totalPlaytime", value: formatPlaytime(getSafeStat("Quiz", "totalPlaytime") as number) },
        ]},
        { name: "Tetris", stats: [
            { title: "gamesPlayed", value: getSafeStat("Tetris", "gamesPlayed") },
            { title: "highScore", value: (getSafeStat("Tetris", "highScore") as number).toLocaleString() },
            { title: "linesCleared", value: getSafeStat("Tetris", "linesCleared") },
            { title: "totalPlaytime", value: formatPlaytime(getSafeStat("Tetris", "totalPlaytime") as number) },
        ]},
        { name: "Snake", stats: [
            { title: "gamesPlayed", value: getSafeStat("Snake", "gamesPlayed") },
            { title: "highScore", value: (getSafeStat("Snake", "highScore") as number).toLocaleString() },
            { title: "applesEaten", value: getSafeStat("Snake", "applesEaten") },
            { title: "totalPlaytime", value: formatPlaytime(getSafeStat("Snake", "totalPlaytime") as number) },
        ]},
        { name: "Flippy Bird", stats: [
            { title: "gamesPlayed", value: getSafeStat("Flippy Bird", "gamesPlayed") },
            { title: "highScore", value: (getSafeStat("Flippy Bird", "highScore") as number).toLocaleString() },
            { title: "pipesPassed", value: getSafeStat("Flippy Bird", "pipesPassed") },
            { title: "totalPlaytime", value: formatPlaytime(getSafeStat("Flippy Bird", "totalPlaytime") as number) },
        ]},
        { name: "Memory", stats: [
            { title: "gamesPlayed", value: getSafeStat("Memory", "gamesPlayed") },
            { title: "highScore", value: (getSafeStat("Memory", "highScore") as number).toLocaleString() },
            { title: "bestTime", value: `${getSafeStat("Memory", "bestTime", "N/A")}s` },
            { title: "totalPlaytime", value: formatPlaytime(getSafeStat("Memory", "totalPlaytime") as number) },
        ]},
        { name: "Puzzle", stats: [
            { title: "gamesPlayed", value: getSafeStat("Puzzle", "gamesPlayed") },
            { title: "highScore", value: (getSafeStat("Puzzle", "highScore") as number).toLocaleString() },
            { title: "bestTime", value: `${getSafeStat("Puzzle", "bestTime", "N/A")}s` },
            { title: "totalPlaytime", value: formatPlaytime(getSafeStat("Puzzle", "totalPlaytime") as number) },
        ]},
    ];


    // Gère la réinitialisation des statistiques de l'utilisateur.
    const handleResetStats = async () => {
        await resetStats();
        toast({
            title: t('statsReset'),
            description: t('statsResetMessage'),
        })
    }

    return (
        <div className="space-y-8">
            {/* Carte des statistiques globales */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart className="h-6 w-6" />
                        {t('overallStatistics')}
                    </CardTitle>
                    <CardDescription>{t('overallStatisticsSubtitle')}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <Gamepad2 className="h-8 w-8 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">{stats.overall.totalGames}</p>
                        <p className="text-sm text-muted-foreground">{t('totalGames')}</p>
                    </div>
                     <div className="p-4 bg-muted/50 rounded-lg">
                        <Star className="h-8 w-8 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">{t(stats.overall.favoriteGame.toLowerCase().replace(' ', '') || 'quiz')}</p>
                        <p className="text-sm text-muted-foreground">{t('favoriteGame')}</p>
                    </div>
                     <div className="p-4 bg-muted/50 rounded-lg">
                        <Trophy className="h-8 w-8 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">{stats.overall.winRate}%</p>
                        <p className="text-sm text-muted-foreground">{t('winRate')}</p>
                    </div>
                     <div className="p-4 bg-muted/50 rounded-lg">
                        <Clock className="h-8 w-8 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold tabular-nums">{totalPlaytimeFormatted}</p>
                        <p className="text-sm text-muted-foreground">{t('totalPlaytime')}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Carte des statistiques par jeu */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gamepad2 className="h-6 w-6" />
                        {t('perGameStatistics')}
                    </CardTitle>
                    <CardDescription>{t('perGameStatisticsSubtitle')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {gameStatsConfig.map((game, index) => (
                        <div key={index}>
                            <h3 className="text-xl font-semibold mb-3 font-headline">{t(game.name.toLowerCase().replace(' ', ''))}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {game.stats.map((stat, statIndex) => (
                                    <div key={statIndex} className="p-4 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xl font-bold tabular-nums">{stat.value}</p>
                                        <p className="text-sm text-muted-foreground">{t(stat.title)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Zone de danger pour les actions irréversibles */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('dangerZone')}</CardTitle>
                    <CardDescription>{t('dangerZoneSubtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <RotateCcw className="mr-2 h-4 w-4" />
                                {t('resetAllStats')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('resetStatsConfirmation')}
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetStats}>{t('continue')}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
