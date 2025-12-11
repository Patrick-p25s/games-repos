
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";

export function AppViewCounter() {
  const { incrementViewCount } = useAuth();

  useEffect(() => {
    // We only want to increment the view count once per session.
    // This key is checked on every render, but the increment function
    // is only called if the key is not found in sessionStorage.
    const hasIncremented = sessionStorage.getItem("nextgen-games-view-incremented");
    if (!hasIncremented) {
      incrementViewCount();
      // Once incremented, we set the key in sessionStorage.
      // This will persist for the duration of the browser tab session.
      sessionStorage.setItem("nextgen-games-view-incremented", "true");
    }
  }, [incrementViewCount]);

  return null;
}
