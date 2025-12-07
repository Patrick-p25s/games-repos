
'use client';
import Link from "next/link";
import { useLocale } from "@/contexts/locale-context";

export function Footer() {
    const { t } = useLocale();
    return (
        <footer className="w-full border-t bg-background">
            <div className="container flex h-16 items-center justify-center">
                <nav className="flex gap-6 text-sm font-medium text-muted-foreground">
                    <Link href="/" className="hover:text-primary transition-colors">{t('games')}</Link>
                    <Link href="/leaderboard" className="hover:text-primary transition-colors">{t('leaderboard')}</Link>
                    <Link href="/profile" className="hover:text-primary transition-colors">{t('profile')}</Link>
                </nav>
            </div>
        </footer>
    );
}
