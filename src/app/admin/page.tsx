
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { useLocale } from "@/contexts/locale-context";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const { isAdmin, isLoggedIn, user } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Si l'état de l'utilisateur est en cours de chargement, nous attendons.
    if (user === undefined) {
      return;
    }
    
    // Une fois que l'état de l'utilisateur est connu (null ou un objet utilisateur), nous procédons.
    setIsCheckingAuth(false);
    
    if (!isLoggedIn) {
      router.push("/login");
    } else if (!isAdmin) {
      router.push("/");
    }
  }, [isAdmin, isLoggedIn, user, router]);

  // Affiche un spinner pendant que l'état d'authentification est vérifié.
  if (isCheckingAuth) {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  // Si l'utilisateur n'est pas un administrateur connecté, ne rien rendre (la redirection aura déjà été déclenchée).
  if (!isAdmin || !isLoggedIn) {
    return null;
  }

  // Affiche le tableau de bord une fois l'authentification confirmée.
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
