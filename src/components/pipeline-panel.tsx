"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  CircleAlert,
  Loader2,
  ListChecks,
  Terminal,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STAGE_DEFS } from "@/lib/types";
import {
  FALLBACK_STAGE_ICON,
  faNum,
  JOB_STATUS_META,
  STAGE_ICONS,
  STAGE_STATUS_META,
  type JobData,
  type StageState,
  type StageStatus,
} from "@/components/shared";

/** نوار پیشرفت راست‌به‌چپ سفارشی */
function StageBar({
  value,
  tone,
  pulse,
}: {
  value: number;
  tone: string;
  pulse?: boolean;
}) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-border/70 dark:bg-zinc-800"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${tone} ${pulse ? "animate-pulse" : ""}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function toneFor(status: StageStatus): { bar: string; box: string } {
  switch (status) {
    case "running":
      return {
        bar: "bg-gradient-to-l from-amber-400 to-amber-500",
        box: "border-amber-300 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5",
      };
    case "done":
      return {
        bar: "bg-gradient-to-l from-emerald-400 to-emerald-600",
        box: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-950/20",
      };
    case "error":
      return {
        bar: "bg-red-500",
        box: "border-red-300 bg-red-50/60 dark:border-red-500/30 dark:bg-red-950/20",
      };
    default:
      return {
        bar: "bg-zinc-300 dark:bg-zinc-700",
        box: "border-border bg-card",
      };
  }
}

function LogBox({ logs }: { logs: string[] }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div
        ref={ref}
        dir="rtl"
        className="scrollbar-thin mt-3 max-h-48 overflow-y-auto rounded-xl bg-zinc-900 px-4 py-3 font-mono text-xs leading-6 text-emerald-200 shadow-inner dark:bg-black dark:text-emerald-300"
      >
        <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase text-zinc-500">
          <Terminal className="size-3" aria-hidden />
          گزارش مرحله
        </p>
        {logs.length === 0 ? (
          <p className="animate-pulse text-zinc-500">در انتظار گزارش…</p>
        ) : (
          logs.map((line, i) => (
            <p key={i} className="whitespace-pre-wrap break-words">
              <span className="text-emerald-500">›</span> {line}
            </p>
          ))
        )}
      </div>
    </motion.div>
  );
}

function faDuration(fromIso?: string, toIso?: string, stillRunning = false): string {
  if (!fromIso) return "";
  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : stillRunning ? Date.now() : NaN;
  if (!isFinite(to) || to < from) return "";
  const secs = Math.max(1, Math.round((to - from) / 1000));
  if (secs < 60) return `${faNum(secs)} ثانیه`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${faNum(m)} دقیقه و ${faNum(s)} ثانیه` : `${faNum(m)} دقیقه`;
}

function StageRow({ stage }: { stage: StageState }) {
  const Icon = STAGE_ICONS[stage.key] ?? FALLBACK_STAGE_ICON;
  const meta = STAGE_STATUS_META[stage.status];
  const tone = toneFor(stage.status);
  const value =
    stage.status === "done" ? 100 : stage.status === "running" ? 65 : stage.status === "error" ? 100 : 0;
  const [, tick] = React.useState(0);

  // نمایش/پنهان‌سازی دستی گزارش — برای مراحل تمام‌شده هم در دسترس است
  const [manualOpen, setManualOpen] = React.useState<boolean | null>(null);
  const autoShow = stage.status === "running" || stage.status === "error";
  const logsOpen = manualOpen !== null ? manualOpen : autoShow;
  const hasLogs = (stage.logs?.length ?? 0) > 0;

  // به‌روزرسانی ثانیه‌شمار مرحله در حال اجرا
  React.useEffect(() => {
    if (stage.status !== "running") return;
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [stage.status]);

  const duration =
    stage.status === "running"
      ? faDuration(stage.startedAt, undefined, true)
      : stage.status === "done" || stage.status === "error"
        ? faDuration(stage.startedAt, stage.endedAt)
        : "";

  return (
    <div className={`rounded-2xl border p-4 transition-colors duration-300 ${tone.box}`}>
      <div className="flex items-start gap-3">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
            stage.status === "done"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              : stage.status === "running"
                ? "animate-pulse bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                : stage.status === "error"
                  ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                  : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="size-5" aria-hidden />
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold">{stage.title}</p>
            <Badge variant="outline" className={`h-6 rounded-full px-2.5 text-[11px] ${meta.badge}`}>
              {meta.label}
            </Badge>
            {duration && (
              <span
                className="flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground ring-1 ring-border"
                dir="rtl"
              >
                <Timer className="size-3" aria-hidden />
                {duration}
                {stage.status === "running" ? "…" : ""}
              </span>
            )}
            {stage.status === "running" && (
              <Loader2 className="size-3.5 animate-spin text-amber-500" aria-hidden />
            )}
            {hasLogs && stage.status !== "running" && (
              <button
                type="button"
                onClick={() => setManualOpen(!logsOpen)}
                aria-expanded={logsOpen}
                className={`ms-auto flex h-7 items-center gap-1 rounded-full bg-background/70 px-2.5 text-[10.5px] font-medium text-muted-foreground ring-1 ring-border transition-colors hover:text-emerald-700 hover:ring-emerald-300 dark:hover:text-emerald-300 ${
                  logsOpen ? "text-emerald-700 ring-emerald-300 dark:text-emerald-300" : ""
                }`}
              >
                <Terminal className="size-3" aria-hidden />
                گزارش ({faNum(stage.logs?.length ?? 0)})
                <ChevronDown
                  className={`size-3 transition-transform duration-200 ${logsOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            )}
          </div>
          <StageBar value={value} tone={tone.bar} pulse={stage.status === "running"} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {logsOpen && <LogBox logs={stage.logs ?? []} />}
      </AnimatePresence>
    </div>
  );
}

export function PipelinePanel({ job }: { job: JobData }) {
  const ordered: StageState[] = STAGE_DEFS.map((def) => {
    const found = job.stages.find((s) => s.key === def.key);
    return {
      key: def.key,
      title: found?.title ?? def.title,
      status: found?.status ?? "pending",
      logs: found?.logs ?? [],
      startedAt: found?.startedAt,
      endedAt: found?.endedAt,
    };
  });

  const doneCount = ordered.filter((s) => s.status === "done").length;
  const runningCount = ordered.filter((s) => s.status === "running").length;
  const overall = Math.round(((doneCount + runningCount * 0.5) / ordered.length) * 100);
  const jobMeta = JOB_STATUS_META[job.status];

  return (
    <motion.section
      id="pipeline"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="scroll-mt-24"
    >
      <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              <ListChecks className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-extrabold">پروسه اجرا</h2>
              <p className="text-xs text-muted-foreground" dir="ltr">
                job: {job.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`rounded-full px-3 py-1 ${jobMeta.badge}`}>
              {jobMeta.label}
            </Badge>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {faNum(overall)}٪
            </span>
          </div>
        </div>

        <StageBar
          value={overall}
          tone={job.status === "error" ? "bg-red-500" : "bg-gradient-to-l from-emerald-400 to-emerald-600"}
        />

        <div className="mt-5 space-y-3">
          {ordered.map((stage) => (
            <StageRow key={stage.key} stage={stage} />
          ))}
        </div>

        {job.status === "error" && job.error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">پردازش با خطا متوقف شد</p>
              <p className="mt-1 text-xs leading-6">{job.error}</p>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
