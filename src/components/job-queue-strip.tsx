"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Layers, Loader2, Radar } from "lucide-react";
import { toast } from "sonner";
import { apiJson, faNum, type JobStatus } from "@/components/shared";

/* ─── نوار صف پردازش همزمان ─────────────────────────────────
   همه پروسه‌های در حال اجرا/آماده‌سازی را می‌کاود و به‌صورت چیپ
   نمایش می‌دهد؛ کاربر می‌تواند بین پروسه‌های موازی جابه‌جا شود. */

interface ActiveJobChip {
  id: string;
  status: JobStatus | string;
  currentStage: string;
  cardsTotal: number;
  cardsDone: number;
  watermarkText: string;
  samples: string[];
}

interface JobQueueStripProps {
  activeJobId: string;
  onOpenJob: (id: string) => void;
  /** هر تغییری که نشان دهد داده‌های پروسه عوض شده (پایان پردازش و…) */
  refreshKey: number;
}

const STAGE_SHORT: Record<string, string> = {
  naming: "نام‌گذاری",
  pricing: "قیمت‌گذاری",
  images: "تصاویر",
  verify: "راستی‌آزمایی",
  optimize: "بهینه‌سازی",
  build: "ساخت کارت",
};

export function JobQueueStrip({ activeJobId, onOpenJob, refreshKey }: JobQueueStripProps) {
  const [chips, setChips] = React.useState<ActiveJobChip[]>([]);
  const [loadedOnce, setLoadedOnce] = React.useState(false);

  const fetchActive = React.useCallback(async () => {
    try {
      const data = await apiJson<{
        ok: boolean;
        jobs: {
          id: string;
          status: string;
          currentStage: string;
          cardsTotal: number;
          cardsDone: number;
          watermarkText: string;
          samples: string[];
        }[];
      }>("/api/jobs");
      const active = data.jobs
        .filter((j) => j.status === "running" || j.status === "pending")
        .map((j) => ({
          id: j.id,
          status: j.status,
          currentStage: j.currentStage,
          cardsTotal: j.cardsTotal,
          cardsDone: j.cardsDone,
          watermarkText: j.watermarkText,
          samples: j.samples,
        }));
      setChips(active);
    } catch {
      /* بی‌صدا — نوار صف حیاتی نیست */
    } finally {
      setLoadedOnce(true);
    }
  }, []);

  // واکشی اولیه + هنگام تغییر refreshKey
  React.useEffect(() => {
    void fetchActive();
  }, [fetchActive, refreshKey]);

  // کاوش آرام همیشه فعال (برای کشف پروسه‌های تازه موازی) + کاوش سریع هنگام فعالیت
  const hasActive = chips.length > 0;
  React.useEffect(() => {
    const timer = window.setInterval(() => void fetchActive(), hasActive ? 2500 : 6000);
    return () => window.clearInterval(timer);
  }, [hasActive, fetchActive]);

  if (!loadedOnce || chips.length === 0) return null;
  // اگر تنها پروسه‌ی فعال، همان پروسه در حال نمایش است، پنل پایپ‌لاین خودش نمایشش می‌دهد
  const onlyTracked = chips.length === 1 && chips[0].id === activeJobId;
  if (onlyTracked) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-l from-emerald-50/80 via-background to-amber-50/60 p-3 shadow-sm dark:border-emerald-500/20 dark:from-emerald-950/20 dark:via-background dark:to-amber-950/10"
      aria-label="صف پردازش همزمان"
    >
      {/* لکه نور پس‌زمینه */}
      <span
        className="pointer-events-none absolute -left-8 -top-10 size-28 rounded-full bg-emerald-300/20 blur-2xl dark:bg-emerald-500/10"
        aria-hidden
      />

      <div className="relative flex items-center gap-2 overflow-x-auto scrollbar-thin pb-0.5">
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600/10 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Radar className="size-3.5 animate-pulse" aria-hidden />
          صف پردازش ({faNum(chips.length)})
        </span>

        <AnimatePresence initial={false}>
          {chips.map((chip) => {
            const isActive = chip.id === activeJobId;
            const pct = chip.cardsTotal > 0 ? Math.round((chip.cardsDone / chip.cardsTotal) * 100) : 0;
            const label = chip.samples?.[0]?.slice(0, 34) || "پروسه بدون عنوان";
            return (
              <motion.button
                key={chip.id}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                type="button"
                onClick={() => {
                  if (!isActive) {
                    onOpenJob(chip.id);
                    toast.info("پروسه از صف باز شد");
                  }
                }}
                className={`group flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-right transition-all ${
                  isActive
                    ? "border-emerald-400 bg-white shadow-md shadow-emerald-600/10 dark:border-emerald-500/50 dark:bg-emerald-950/40"
                    : "border-border/70 bg-card/80 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm dark:bg-card/60"
                }`}
                aria-label={`پروسه ${label} — ${STAGE_SHORT[chip.currentStage] || "در انتظار"} — ${faNum(chip.cardsDone)} از ${faNum(chip.cardsTotal)} کارت`}
              >
                {chip.status === "running" ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-amber-500" aria-hidden />
                ) : (
                  <Layers className="size-4 shrink-0 animate-pulse text-zinc-400" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="max-w-44 truncate text-xs font-bold" title={label}>
                      {label}
                    </span>
                    {isActive && (
                      <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        <Eye className="size-2.5" aria-hidden />
                        در حال نمایش
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded bg-muted px-1 py-0.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      {STAGE_SHORT[chip.currentStage] || "آماده‌سازی"}
                    </span>
                    {faNum(chip.cardsDone)}/{faNum(chip.cardsTotal)} کارت
                  </span>
                </span>
                {/* حلقه پیشرفت کوچک */}
                <span
                  className="relative grid size-8 shrink-0 place-items-center"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <svg viewBox="0 0 36 36" className="size-8 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" className="stroke-muted" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${(pct * 97.4) / 100} 97.4`}
                      className="stroke-emerald-500 transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute text-[8px] font-bold text-emerald-700 dark:text-emerald-300">
                    {faNum(pct)}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {chips.length > 1 && (
        <p className="relative mt-1.5 px-1 text-[10px] text-muted-foreground">
          چند پروسه به‌طور همزمان در پس‌زمینه پردازش می‌شوند؛ برای مشاهده روی هرکدام کلیک کنید.
        </p>
      )}
    </motion.section>
  );
}

export { JobQueueStrip as default };
