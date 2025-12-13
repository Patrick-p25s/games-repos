
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { useLocale } from "@/contexts/locale-context";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const { isAdmin, isLoggedIn, isLoaded } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  
  useEffect(() => {
    // We wait until the auth state is fully loaded and confirmed.
    if (!isLoaded) {
      return; // Do nothing while loading
    }
    
    // Once loaded, we can make a decision.
    if (!isLoggedIn) {
      router.push("/login"); // If not logged in, go to login.
    } else if (!isAdmin) {
      router.push("/"); // If logged in but not admin, go to home.
    }
  }, [isLoaded, isLoggedIn, isAdmin, router]);

  // While the auth state is being determined, show a loading spinner.
  if (!isLoaded || !isLoggedIn || !isAdmin) {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  // Only render the dashboard if the user is a confirmed admin.
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
