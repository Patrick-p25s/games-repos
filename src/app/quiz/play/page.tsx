
'use client';
import { QuizClient } from "@/components/quiz/quiz-client";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/contexts/locale-context";

function QuizLoadingSkeleton() {
    const { t } = useLocale();
    return (
        <div className="container py-12 flex justify-center">
            <div className="w-full max-w-3xl space-y-8 animate-pulse">
                <Skeleton className="h-12 w-3/4 mx-auto" />
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-12 w-48" />
                </div>
            </div>
        </div>
    )
}

export default function PlayQuizPage() {
  const { t } = useLocale();
  return (
    <Suspense fallback={<QuizLoadingSkeleton />}>
      <QuizClient />
    </Suspense>
  );
}
