// Ce fichier contient le composant du tableau de bord de l'administrateur.
"use client";

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
import { Trash2, Reply, Users2, MessageSquare, Clock, Gamepad2, Send, Eye, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "../ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import { useAuth, type Feedback } from "@/contexts/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";


// Schéma de validation pour le formulaire de réponse.
const replySchema = z.object({
    message: z.string().min(10, { message: "Le message doit contenir au moins 10 caractères." }),
});

// Composant pour la boîte de dialogue de réponse à un feedback.
function ReplyDialog({ feedbackItem }: { feedbackItem: Feedback }) {
    const { t } = useLocale();
    const { sendReply } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const form = useForm<z.infer<typeof replySchema>>({
        resolver: zodResolver(replySchema),
        defaultValues: {
            message: "",
        },
    });

    // Gère la soumission du formulaire de réponse.
    async function onSubmit(values: z.infer<typeof replySchema>) {
        if (isSending) return;
        setIsSending(true);
        try {
            await sendReply(feedbackItem.userId, feedbackItem.subject, values.message, feedbackItem.id);
            toast({
              title: t('replySent'),
              description: t('replySentMessage', { name: feedbackItem.name }),
            });
            form.reset();
            setOpen(false); // Ferme la boîte de dialogue après l'envoi.
        } catch (error) {
            toast({
              variant: "destructive",
              title: t('error'),
              description: "Failed to send reply. Please try again.",
            });
        } finally {
            setIsSending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Reply className="h-4 w-4" />
                    <span className="sr-only">{t('reply')}</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('replyTo', { name: feedbackItem.name })}</DialogTitle>
                    <DialogDescription>{t('originalMessage')}: "{feedbackItem.subject}"</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('yourReply')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('yourReplyPlaceholder')} {...field} rows={5} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" disabled={isSending}>{t('cancel')}</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSending}>
                                {isSending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                {t('sendReply')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// Composant principal du tableau de bord de l'administrateur.
export function AdminDashboard() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { allUsers, allFeedback, deleteFeedback, viewCount } = useAuth();
  
  // Calcule le temps de jeu total de tous les utilisateurs.
  const totalPlaytimeSeconds = allUsers.reduce((total, user) => {
    if (!user.stats || !user.stats.overall) return total;
    return total + user.stats.overall.totalPlaytime;
  }, 0);
  
  // Formate les secondes en une chaîne lisible (ex: "HH:MM:SS").
    const formatTotalPlaytime = (seconds: number): string => {
        if (isNaN(seconds) || seconds < 0) return '00:00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

  const totalPlaytimeDisplay = formatTotalPlaytime(totalPlaytimeSeconds);
  
  // Compte le jeu le plus populaire en se basant sur le jeu favori de chaque utilisateur.
  const gameCounts = allUsers.reduce((acc, user) => {
    if (user && user.stats && user.stats.overall) {
        const game = user.stats.overall.favoriteGame;
        if (game && game !== "N/A") {
            acc[game] = (acc[game] || 0) + 1;
        }
    }
    return acc;
  }, {} as Record<string, number>);

  const mostPopularGame = Object.keys(gameCounts).reduce((a, b) => gameCounts[a] > gameCounts[b] ? a : b, 'N/A');

  // Gère la suppression d'un feedback.
  const handleDeleteFeedback = async (id: string) => {
    try {
        await deleteFeedback(id);
        toast({
          title: t('feedbackDeleted'),
          description: t('feedbackDeletedMessage', { id }),
        });
    } catch (error) {
         toast({
          variant: "destructive",
          title: t('error'),
          description: "Failed to delete feedback. Please try again.",
        });
    }
  };

  return (
    <div className="space-y-8">
        {/* Cartes de statistiques globales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
                    <Users2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{allUsers.length}</div>
                    <p className="text-xs text-muted-foreground">{t('totalUsersDescription')}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('pendingFeedback')}</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{allFeedback.length}</div>
                    <p className="text-xs text-muted-foreground">{t('pendingFeedbackDescription')}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('totalPlaytime')}</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tabular-nums">{totalPlaytimeDisplay}</div>
                    <p className="text-xs text-muted-foreground">{t('totalPlaytimeDescription')}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('mostPopularGame')}</CardTitle>
                    <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{mostPopularGame !== 'N/A' ? t(mostPopularGame.toLowerCase().replace(' ', '')) : 'N/A'}</div>
                    <p className="text-xs text-muted-foreground">{t('mostPopularGameDescription')}</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('totalViews')}</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{viewCount}</div>
                    <p className="text-xs text-muted-foreground">{t('totalViewsDescription')}</p>
                </CardContent>
            </Card>
        </div>
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-8 grid w-full grid-cols-2">
            <TabsTrigger value="users">
                {t('users')}
            </TabsTrigger>
            <TabsTrigger value="feedback">
                {t('feedback')}
            </TabsTrigger>
        </TabsList>
        <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>{t('userManagement')}</CardTitle>
                <CardDescription>{t('userManagementSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('user')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('role')}</TableHead>
                      <TableHead className="text-center">{t('gamesPlayed')}</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">{t('winRate')}</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">{t('playtime')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{user.name ? user.name.charAt(0) : 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="capitalize">{t(user.role)}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{user.stats?.overall?.totalGames ?? 0}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell font-medium">{user.stats?.overall?.winRate ?? 0}%</TableCell>
                        <TableCell className="text-center hidden sm:table-cell font-medium tabular-nums">{formatTotalPlaytime(user.stats?.overall?.totalPlaytime ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <CardTitle>{t('userFeedback')}</CardTitle>
                <CardDescription>{t('userFeedbackSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allFeedback.length > 0 ? allFeedback.map((item) => (
                    <Card key={item.id} className="bg-muted/30">
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{item.subject}</CardTitle>
                                 <div className="flex items-center gap-2">
                                     <ReplyDialog feedbackItem={item} />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">{t('delete')}</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>{t('deleteFeedbackTitle')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t('deleteFeedbackMessage')}
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteFeedback(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                            <CardDescription>{t('from', { name: item.name, email: item.email })} {t('on')} {new Date(item.date).toLocaleDateString()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{item.message}</p>
                        </CardContent>
                    </Card>
                )) : <p className="text-muted-foreground text-center">{t('noFeedbackYet')}</p>}
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
