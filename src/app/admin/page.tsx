
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { useLocale } from "@/contexts/locale-context";

export default function AdminPage() {
  const { isAdmin, isLoggedIn } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    } else if (isLoggedIn && !isAdmin) {
      router.push("/");
    }
  }, [isAdmin, isLoggedIn, router]);

  if (!isAdmin || !isLoggedIn) {
    return null; // or a loading spinner
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
