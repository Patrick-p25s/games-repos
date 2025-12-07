import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";

export function Header() {
  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60")}>
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-8 flex items-center">
          <Gamepad2 className="h-6 w-6 text-primary" />
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2 md:space-x-4">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
