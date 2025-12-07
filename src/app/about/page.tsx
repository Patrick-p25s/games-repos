
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackForm } from "@/components/about/feedback-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocale } from "@/contexts/locale-context";
import { Button } from "@/components/ui/button";
import { Facebook, Linkedin, Mail, Github, Phone } from "lucide-react";
import Link from "next/link";
import Image from "next/image";


export default function AboutPage() {
    const { t } = useLocale();
  return (
    <div className="container py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight font-headline">{t('aboutTitle')}</h1>
             <p className="mt-4 text-lg text-muted-foreground">
                {t('aboutSubtitle')}
            </p>
        </div>
      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="creator" className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="mb-8">
                    <TabsTrigger value="game">{t('theGame')}</TabsTrigger>
                    <TabsTrigger value="group">{t('theGroup')}</TabsTrigger>
                    <TabsTrigger value="creator">{t('theCreator')}</TabsTrigger>
                    <TabsTrigger value="feedback">{t('feedback')}</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <TabsContent value="game">
                <Card>
                <CardHeader>
                    <CardTitle>{t('theGame')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground text-base">
                    <p>
                        {t('gameDescription1')}
                    </p>
                    <p>
                        {t('gameDescription2')}
                    </p>
                </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="group">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('theGroup')}</CardTitle>
                        <CardDescription>{t('groupSubtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-muted-foreground text-base">
                        <p>{t('groupDescription')}</p>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="creator">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('theCreator')}</CardTitle>
                        <CardDescription>{t('creatorSubtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6">
                        <Avatar className="h-32 w-32 border-4 border-primary">
                            <Image src="/img/patrick-nomentsoa.jpg" alt="Patrick Nomentsoa" width={128} height={128} className="aspect-square object-cover" />
                            <AvatarFallback>PN</AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                            <p className="text-muted-foreground text-base" dangerouslySetInnerHTML={{ __html: t('creatorDescription') }} />
                             <div className="mt-4 flex justify-center gap-4">
                                <Button variant="outline" size="icon" asChild>
                                    <Link href="mailto:patricknomentsoa.p25s@gmail.com" target="_blank">
                                        <Mail className="h-5 w-5" />
                                        <span className="sr-only">Email</span>
                                    </Link>
                                </Button>
                                <Button variant="outline" size="icon" asChild>
                                    <Link href="https://www.linkedin.com/in/randrianantenaina-nomentsoa-patrick-40a129390/" target="_blank">
                                        <Linkedin className="h-5 w-5" />
                                        <span className="sr-only">LinkedIn</span>
                                    </Link>
                                </Button>
                                <Button variant="outline" size="icon" asChild>
                                    <Link href="https://www.facebook.com/profile.php?id=61572575325517" target="_blank">
                                        <Facebook className="h-5 w-5" />
                                        <span className="sr-only">Facebook</span>
                                    </Link>
                                </Button>
                                <Button variant="outline" size="icon" asChild>
                                    <Link href="https://github.com/Patrick-p25s" target="_blank">
                                        <Github className="h-5 w-5" />
                                        <span className="sr-only">GitHub</span>
                                    </Link>
                                </Button>
                                <Button variant="outline" size="icon" asChild>
                                    <Link href="tel:+261388545419" target="_blank">
                                        <Phone className="h-5 w-5" />
                                        <span className="sr-only">Phone</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="feedback">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('sendFeedback')}</CardTitle>
                        <CardDescription>{t('feedbackSubtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FeedbackForm />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
