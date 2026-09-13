"use client";

import { Library, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CardLibraryDialog } from "@/components/card-library";

export function AppHeader({ onSettingsClick }: { onSettingsClick: () => void }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-3 md:gap-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-extrabold sm:text-base md:text-lg">
              کارت‌ساز هوشمند محصول
            </p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              از نام یا لینک تا کارت آماده فروش، تمام‌خودکار
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <CardLibraryDialog>
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl transition-colors hover:border-emerald-400 hover:text-emerald-700"
            >
              <Library className="size-4" aria-hidden />
              <span className="hidden sm:inline">کتابخانه</span>
            </Button>
          </CardLibraryDialog>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl transition-colors hover:border-emerald-400 hover:text-emerald-700"
            onClick={onSettingsClick}
            aria-label="تنظیمات"
          >
            <Settings className="size-4" aria-hidden />
            <span className="hidden min-[420px]:inline">تنظیمات</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
