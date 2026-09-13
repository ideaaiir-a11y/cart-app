"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { STAGE_DEFS } from "@/lib/types";
import { FALLBACK_STAGE_ICON, STAGE_ICONS } from "@/components/shared";

export function HeroStrip() {
  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-bl from-emerald-50 via-card to-amber-50 p-5 shadow-sm md:p-8 dark:from-emerald-950/40 dark:via-card dark:to-amber-950/20"
    >
      {/* لکه‌های نوری تزئینی */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-600/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-10 size-64 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-600/15"
      />
      {/* بافت نقطه‌ای ظریف */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(16,185,129,0.18) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative max-w-2xl space-y-3">
        <motion.span
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          <Sparkles className="size-3.5" aria-hidden />
          خط تولید هوشمند ۶ مرحله‌ای
        </motion.span>

        <h1 className="text-2xl font-extrabold leading-snug md:text-4xl md:leading-snug">
          کارت‌ساز{" "}
          <span className="bg-gradient-to-l from-emerald-600 via-emerald-500 to-amber-500 bg-clip-text text-transparent dark:from-emerald-400 dark:via-emerald-300 dark:to-amber-400">
            هوشمند محصول
          </span>
        </h1>
        <p className="text-sm leading-7 text-muted-foreground md:text-base md:leading-8">
          نام یا لینک محصول را وارد کنید؛ خط تولید هوشمند در شش گام خودکار،
          عنوان استاندارد را انتخاب می‌کند، قیمت را از بازار می‌یابد، تصویر را با
          واترمارک شما آماده می‌سازد، صحت اطلاعات را راستی‌آزمایی می‌کند، محتوا
          را بهینه می‌نویسد و در پایان کارت HTML فارسیِ آماده انتشار تحویل
          می‌دهد.
        </p>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        {STAGE_DEFS.map((stage, i) => {
          const Icon = STAGE_ICONS[stage.key] ?? FALLBACK_STAGE_ICON;
          return (
            <motion.span
              key={stage.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.3 }}
              title={stage.desc}
              className="inline-flex h-10 cursor-default items-center gap-2 rounded-full border bg-card/80 px-3.5 text-xs font-medium shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md md:text-sm dark:hover:border-emerald-500/40 dark:hover:bg-emerald-950/40"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                {i + 1}
              </span>
              <Icon className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              {stage.title}
            </motion.span>
          );
        })}
      </div>
    </motion.section>
  );
}
