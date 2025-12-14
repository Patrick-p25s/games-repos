
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { useMemo } from "react";
import type { LeaderboardUser } from "@/contexts/auth-context";

type Player = {
  rank: number;
  player: string;
  score: number;
};

type GameLeaderboard = {
  game: string;
  players: Player[];
};

type GameKey = keyof LeaderboardUser['stats']['games'];

const GAME_KEYS: GameKey[] = ["Quiz", "Tetris", "Snake", "Flippy Bird", "Memory", "Puzzle"];


export default function LeaderboardPage() {
  const { t } = useLocale();
  const { leaderboardData: allUsers } = useAuth();

  const leaderboardData: GameLeaderboard[] = useMemo(() => {
    return GAME_KEYS.map(gameKey => {
      // 1. Map users to a player object with a score, filtering out those with no score or score of 0
      const playersWithScores = allUsers
        .map(user => {
          const score = user?.stats?.games?.[gameKey]?.highScore ?? 0;
          return {
            name: user?.name,
            score: score,
          };
        })
        .filter(player => player.name && player.score > 0);

      // 2. Sort the valid players by score in descending order
      const sortedPlayers = playersWithScores.sort((a, b) => b.score - a.score);
      
      // 3. Take the top 10 and map them to the final Player format with a rank
      const topPlayers = sortedPlayers.slice(0, 10).map((player, index) => ({
        rank: index + 1,
        player: player.name!,
        score: player.score,
      }));

      return {
        game: gameKey,
        players: topPlayers,
      };
    });
  }, [allUsers]);

  const defaultTab = leaderboardData.find(board => board.players.length > 0)?.game || (leaderboardData.length > 0 ? leaderboardData[0].game : "");


  return (
    <div className="container py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight font-headline">{t('leaderboardsTitle')}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {t('leaderboardsSubtitle')}
        </p>
      </div>

      {leaderboardData.length > 0 ? (
        <Tabs defaultValue={defaultTab} className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="mb-8">
              {leaderboardData.map((board) => (
                  <TabsTrigger key={board.game} value={board.game}>
                      {t(board.game.toLowerCase().replace(' ', ''))}
                  </TabsTrigger>
              ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
          </ScrollArea>


          {leaderboardData.map((board) => (
            <TabsContent key={board.game} value={board.game}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-headline">
                    {t(board.game.toLowerCase().replace(' ', ''))} {t('leaderboard')}
                  </CardTitle>
                  <CardDescription>{t('topPlayers')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {board.players.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>{t('player')}</TableHead>
                          <TableHead className="text-right">{t('score')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {board.players.map((player) => (
                          <TableRow key={player.rank}>
                            <TableCell className="font-medium text-lg">{player.rank}</TableCell>
                            <TableCell className="text-lg">{player.player}</TableCell>
                            <TableCell className="text-right text-lg font-semibold">{player.score.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center">{t('noScoresYet')}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card className="text-center py-12">
            <CardHeader>
                <CardTitle>{t('noLeaderboardData')}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{t('noLeaderboardDataSubtitle')}</p>
            </CardContent>
        </Card>
      )}
    </div>
  )
}
