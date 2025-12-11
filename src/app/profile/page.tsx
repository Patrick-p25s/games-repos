
"use client";

import { useAuth } from "@/contexts/auth-context";
import { UserStats } from "@/components/profile/user-stats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogIn, Mail, MailOpen, Trash2 } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";


function Inbox() {
  const { user, deleteMessage } = useAuth();
  const { t } = useLocale();
  const { toast } = useToast();

  const handleDelete = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the accordion from toggling
    deleteMessage(messageId);
    toast({
        title: t('messageDeleted'),
        description: t('messageDeletedSuccess'),
    });
  }

  if (!user || user.inbox.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-6 w-6" />
            {t('inbox')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('noMessages')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailOpen className="h-6 w-6 text-primary" />
          {t('inbox')}
        </CardTitle>
        <CardDescription>{t('inboxSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
            {user.inbox.map((msg) => (
                <AccordionItem value={msg.id} key={msg.id}>
                    <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4 items-center">
                            <span className="font-semibold text-left">{msg.subject}</span>
                            <span className="text-sm text-muted-foreground ml-4 shrink-0">{msg.date}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground p-4 bg-muted/50 rounded-md space-y-4">
                        <p>{msg.message}</p>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('deleteMessage')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>{t('deleteMessageTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('deleteMessageConfirmation')}
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => handleDelete(msg.id, e)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    {t('delete')}
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}

export default function ProfilePage() {
  const { isLoggedIn, user } = useAuth();
  const { t } = useLocale();

  if (!isLoggedIn || !user) {
    return (
        <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center py-12">
            <h2 className="text-2xl font-bold font-headline mb-4">{t('accessYourProfile')}</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
                {t('loginToViewProfile')}
            </p>
            <Button size="lg" asChild>
                <Link href="/login">
                    <LogIn className="mr-2 h-5 w-5" />
                    {t('loginToContinue')}
                </Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="flex flex-col items-center text-center mb-12">
          <Avatar className="h-24 w-24 mb-4 border-4 border-primary">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <h1 className="text-4xl font-bold tracking-tight font-headline">{user.name}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
              {t('welcomeBackProfile')}
          </p>
      </div>
      <div className="max-w-4xl mx-auto space-y-8">
        <UserStats />
        <Inbox />
      </div>
    </div>
  );
}
