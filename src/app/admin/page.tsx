
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { useLocale } from "@/contexts/locale-context";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const { isAdmin, isLoggedIn } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // A little delay to ensure the auth state is settled
    const timer = setTimeout(() => {
      if (!isLoggedIn) {
        router.push("/login");
      } else if (isLoggedIn && !isAdmin) {
        router.push("/");
      }
      setIsCheckingAuth(false);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [isAdmin, isLoggedIn, router]);

  if (isCheckingAuth) {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isAdmin || !isLoggedIn) {
    // This part should ideally not be reached due to the redirect, but it's a good fallback.
    return null;
  }

  return (
    <div className="container py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight font-headline">{t('adminDashboardTitle')}</h1>
            <p className="mt-4 text-lg text-muted-foreground">
                {t('adminDashboardSubtitle')}
            </p>
        </div>
      <div className="max-w-7xl mx-auto">
        <AdminDashboard />
      </div>
    </div>
  );
}
