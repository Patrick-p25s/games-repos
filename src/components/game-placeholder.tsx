
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";

export function GamePlaceholder({ gameName }: { gameName: string }) {
  const { t } = useLocale();
  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">{t(gameName.toLowerCase().replace(' ', ''))}</CardTitle>
          <CardDescription className="text-lg">{t('comingSoon')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">
            {t('gameUnderConstruction')}
          </p>
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              {t('backToHome')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
