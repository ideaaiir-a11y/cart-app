"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      className="size-10 rounded-xl transition-transform hover:scale-105"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "تغییر به حالت روشن" : "تغییر به حالت تیره"}
      title={isDark ? "حالت روشن" : "حالت تیره"}
    >
      {isDark ? (
        <Moon className="size-4 text-amber-500" aria-hidden />
      ) : (
        <Sun className="size-4 text-amber-500" aria-hidden />
      )}
    </Button>
  );
}
