"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  Coins,
  Loader2,
  Palette,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson, faNum, themeLabel, toErrorMessage } from "@/components/shared";

/* ─── شمارنده متحرک ───────────────────────────────────────── */

function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if (!isFinite(target) || target <= 0) {
      setVal(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ─── انواع داده ──────────────────────────────────────────── */

interface StatsShape {
  jobsTotal: number;
  jobsDone: number;
  cardsTotal: number;
  cardsDone: number;
  pricedCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  themeDist: { key: string; label: string; swatch: string; count: number }[];
  topTheme: { key: string; label: string; swatch: string; count: number } | null;
  week: { date: string; count: number }[];
}

/* ─── کاشی آمار ───────────────────────────────────────────── */

function StatTile({
  icon,
  iconClass,
  value,
  suffix,
  label,
  hint,
  delay,
}: {
  icon: React.ReactNode;
  iconClass: string;
  value: string;
  suffix?: string;
  label: string;
  hint?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-600/10"
    >
      <div
        className="pointer-events-none absolute -left-6 -top-6 size-16 rounded-full bg-emerald-400/10 blur-xl transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className="flex items-center gap-2.5">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="flex items-baseline gap-1 text-xl font-extrabold leading-7" dir="rtl">
            {value}
            {suffix && <span className="text-[11px] font-medium text-muted-foreground">{suffix}</span>}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
      {hint && (
        <p className="mt-2 truncate border-t pt-2 text-[10px] text-muted-foreground/80">{hint}</p>
      )}
    </motion.div>
  );
}

/* ─── نمودار میله‌ای هفتگی ────────────────────────────────── */

function WeekChart({ week }: { week: StatsShape["week"] }) {
  const max = Math.max(1, ...week.map((d) => d.count));
  const dayLabel = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fa-IR", { weekday: "short" });
    } catch {
      return "";
    }
  };
  return (
    <div>
      <div className="flex h-10 items-end gap-1.5" dir="ltr">
        {week.map((d, i) => (
          <div
            key={i}
            className="group/bar relative flex h-full flex-1 cursor-default flex-col justify-end"
            title={`${faNum(d.count)} پروسه — ${dayLabel(d.date)}`}
          >
            <div
              className={`w-full rounded-t-md transition-all duration-300 group-hover/bar:brightness-110 ${
                d.count > 0
                  ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                  : "bg-muted"
              }`}
              style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            />
            {d.count > 0 && (
              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold leading-none text-emerald-700 dark:text-emerald-400">
                {faNum(d.count)}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5" dir="ltr">
        {week.map((d, i) => (
          <span
            key={i}
            className="flex-1 truncate text-center text-[8px] leading-none text-muted-foreground"
          >
            {dayLabel(d.date)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── نوار آمار ───────────────────────────────────────────── */

export function StatsBar({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = React.useState<StatsShape | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await apiJson<{ ok: boolean; stats: StatsShape }>("/api/stats");
        if (!cancelled) setStats(data.stats);
      } catch (e) {
        if (!silent && !cancelled) {
          toast.error("دریافت آمار ناموفق بود", { description: toErrorMessage(e) });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const cardsDone = useCountUp(stats?.cardsDone ?? 0);
  const jobsDone = useCountUp(stats?.jobsDone ?? 0);
  const avgPrice = useCountUp(stats?.avgPrice ?? 0);

  if (loading && !stats) {
    return (
      <section aria-label="آمار کلی" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[86px] rounded-2xl" />
        ))}
      </section>
    );
  }

  if (!stats || (stats.jobsTotal === 0 && stats.cardsTotal === 0)) return null;

  return (
    <motion.section
      aria-label="آمار کلی"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-2.5"
    >
      <div className="flex items-center gap-2 px-1">
        <BarChart3 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h2 className="text-sm font-extrabold">نمای کلی فروشگاه شما</h2>
        <span className="h-px flex-1 bg-gradient-to-l from-emerald-300/60 to-transparent" aria-hidden />
        {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile
          icon={<Boxes className="size-4.5" aria-hidden />}
          iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
          value={faNum(cardsDone)}
          suffix="کارت"
          label="کارت آماده تحویل"
          hint={`از مجموع ${faNum(stats.cardsTotal)} کارت در ${faNum(stats.jobsTotal)} پروسه`}
          delay={0}
        />
        <StatTile
          icon={<CheckCircle2 className="size-4.5" aria-hidden />}
          iconClass="bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400"
          value={faNum(jobsDone)}
          suffix={`از ${faNum(stats.jobsTotal)}`}
          label="پروسه موفق"
          hint="خط تولید ۶ مرحله‌ای بدون خطا"
          delay={0.05}
        />
        <StatTile
          icon={<Coins className="size-4.5" aria-hidden />}
          iconClass="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
          value={faNum(avgPrice)}
          suffix="تومان"
          label="میانگین قیمت کارت‌ها"
          hint={
            stats.pricedCount > 0
              ? `دامنه: ${faNum(stats.minPrice)} تا ${faNum(stats.maxPrice)}`
              : "هنوز قیمتی ثبت نشده"
          }
          delay={0.1}
        />
        <StatTile
          icon={<Palette className="size-4.5" aria-hidden />}
          iconClass="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400"
          value={stats.topTheme ? themeLabel(stats.topTheme.key) : "—"}
          label="تم محبوب کارت‌ها"
          hint={
            stats.topTheme && stats.topTheme.count > 0
              ? `${faNum(stats.topTheme.count)} کارت با این تم`
              : "هنوز کارتی ساخته نشده"
          }
          delay={0.15}
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35, ease: "easeOut" }}
          className="col-span-2 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-600/10 md:col-span-1"
        >
          <div className="mb-2 flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <p className="text-[11px] font-bold">فعالیت ۷ روز اخیر</p>
          </div>
          <WeekChart week={stats.week} />
        </motion.div>
      </div>
    </motion.section>
  );
}
