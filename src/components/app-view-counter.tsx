
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";

export function AppViewCounter() {
  const { incrementViewCount } = useAuth();

  useEffect(() => {
    // We only want to increment the view count once per session.
    const hasIncremented = sessionStorage.getItem("nextgen-games-view-incremented");
    if (!hasIncremented) {
      incrementViewCount();
      sessionStorage.setItem("nextgen-games-view-incremented", "true");
    }
  }, [incrementViewCount]);

  return null;
}
