"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  ChevronDown,
  History,
  Inbox,
  Loader2,
  FolderOpen,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  apiJson,
  faNum,
  JOB_STATUS_META,
  toErrorMessage,
  type JobStatus,
} from "@/components/shared";

export interface HistoryJob {
  id: string;
  status: JobStatus;
  currentStage: string;
  createdAt: string;
  watermarkText: string;
  watermarkMode: string;
  error: string;
  cardsTotal: number;
  cardsDone: number;
  samples: string[];
}

export function JobHistoryPanel({
  refreshKey,
  activeJobId,
  onOpenJob,
  onRerunJob,
  rerunningId,
}: {
  refreshKey: number;
  activeJobId: string;
  onOpenJob: (id: string) => void;
  onRerunJob: (id: string) => void;
  rerunningId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [jobs, setJobs] = React.useState<HistoryJob[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string>("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ ok: boolean; jobs: HistoryJob[] }>("/api/jobs");
      setJobs(data.jobs || []);
      setSelected((prev) => {
        const ids = new Set(data.jobs?.map((j) => j.id) ?? []);
        const next = new Set([...prev].filter((id) => ids.has(id)));
        return next.size === prev.size ? prev : next;
      });
    } catch (e) {
      if (open) toast.error("دریافت تاریخچه ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load, refreshKey]);

  const removeJob = async (id: string) => {
    setDeleting(id);
    try {
      await apiJson(`/api/jobs/${id}`, { method: "DELETE" });
      setJobs((p) => p.filter((j) => j.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("پروسه حذف شد");
    } catch (e) {
      toast.error("حذف ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setDeleting("");
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkDeleting(true);
    try {
      const data = await apiJson<{ ok: boolean; deleted: number }>("/api/jobs/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setJobs((p) => p.filter((j) => !selected.has(j.id)));
      setSelected(new Set());
      toast.success(`${faNum(data.deleted ?? ids.length)} پروسه حذف شد`);
    } catch (e) {
      toast.error("حذف گروهی ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setBulkDeleting(false);
    }
  };

  const faDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fa-IR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-3 p-5 text-right transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                <History className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-extrabold">تاریخچه پروسه‌ها</h2>
                <p className="text-xs text-muted-foreground">
                  بازبینی، اجرای مجدد، انتخاب و حذف گروهی پروسه‌ها
                </p>
              </div>
            </div>
            <ChevronDown
              className={`size-5 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                در حال دریافت تاریخچه…
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-8 text-center dark:border-emerald-500/20 dark:bg-emerald-950/10">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100 dark:bg-card dark:ring-emerald-500/20">
                  <Inbox className="size-7 text-emerald-400" aria-hidden />
                </span>
                <p className="text-sm font-semibold">هنوز پروسه‌ای ثبت نشده</p>
                <p className="max-w-xs text-xs leading-6 text-muted-foreground">
                  اولین کارت‌هایتان را بسازید — نام محصول را وارد کنید و «شروع پردازش» را بزنید
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* نوار حذف گروهی */}
                <AnimatePresence>
                  {selected.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2.5 dark:border-red-500/30 dark:bg-red-950/20">
                        <span className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300">
                          <Trash2 className="size-4" aria-hidden />
                          {faNum(selected.size)} پروسه انتخاب شده — کارت‌های آن‌ها هم حذف می‌شود
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelected(new Set())}
                            className="h-8 gap-1 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3.5" aria-hidden />
                            لغو انتخاب
                          </Button>
                          <Button
                            size="sm"
                            disabled={bulkDeleting}
                            onClick={() => void bulkDelete()}
                            className="h-8 gap-1.5 rounded-lg bg-red-600 px-3 text-xs text-white hover:bg-red-700"
                          >
                            {bulkDeleting ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <Trash2 className="size-3.5" aria-hidden />
                            )}
                            حذف گروهی
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <ul className="scrollbar-thin max-h-96 space-y-2.5 overflow-y-auto p-1">
                  <AnimatePresence initial={false}>
                    {jobs.map((j) => {
                      const meta = JOB_STATUS_META[j.status] ?? JOB_STATUS_META.pending;
                      const isActive = j.id === activeJobId;
                      const isSelected = selected.has(j.id);
                      const canRerun = (j.status === "done" || j.status === "error") && j.cardsTotal > 0;
                      return (
                        <motion.li
                          key={j.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -24 }}
                          transition={{ duration: 0.25 }}
                          className={`rounded-xl border p-3.5 transition-all ${
                            isSelected
                              ? "border-red-300 bg-red-50/50 dark:border-red-500/40 dark:bg-red-950/15"
                              : isActive
                                ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-950/25"
                                : "hover:border-emerald-200 hover:bg-muted/30 dark:hover:border-emerald-500/20"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              {/* چک‌باکس انتخاب */}
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(v) => toggleSelect(j.id, v === true)}
                                disabled={isActive || j.status === "running"}
                                aria-label={`انتخاب پروسه ${j.id}`}
                                className="shrink-0"
                              />
                              <Badge className={`rounded-full px-2.5 py-0.5 text-[11px] ${meta.badge}`}>
                                {meta.label}
                              </Badge>
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <CalendarClock className="size-3.5" aria-hidden />
                                {faDate(j.createdAt)}
                              </span>
                              <Badge
                                variant="outline"
                                className="rounded-full text-[11px] font-normal"
                              >
                                {faNum(j.cardsDone)}/{faNum(j.cardsTotal)} کارت
                              </Badge>
                              {j.watermarkText && (
                                <span className="text-[11px] text-muted-foreground">
                                  واترمارک: «{j.watermarkText}»
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => onOpenJob(j.id)}
                                disabled={isActive}
                                className="h-8 gap-1 rounded-lg bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <FolderOpen className="size-3.5" aria-hidden />
                                {isActive ? "باز است" : "بازکردن"}
                              </Button>
                              {canRerun && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  aria-label={`اجرای مجدد پروسه ${j.id}`}
                                  disabled={rerunningId === j.id || j.status === "running"}
                                  onClick={() => onRerunJob(j.id)}
                                  className="h-8 gap-1 rounded-lg border-violet-300 px-2.5 text-xs text-violet-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-800 dark:border-violet-500/40 dark:text-violet-300 dark:hover:bg-violet-950/30"
                                >
                                  {rerunningId === j.id ? (
                                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                                  ) : (
                                    <RotateCcw className="size-3.5" aria-hidden />
                                  )}
                                  اجرای مجدد
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`حذف پروسه ${j.id}`}
                                disabled={deleting === j.id}
                                onClick={() => void removeJob(j.id)}
                                className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-red-600"
                              >
                                {deleting === j.id ? (
                                  <Loader2 className="size-4 animate-spin" aria-hidden />
                                ) : (
                                  <Trash2 className="size-4" aria-hidden />
                                )}
                              </Button>
                            </div>
                          </div>
                          {j.samples.length > 0 && (
                            <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                              {j.samples.join(" • ")}
                              {j.cardsTotal > j.samples.length ? " …" : ""}
                            </p>
                          )}
                          {j.error && (
                            <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                              {j.error}
                            </p>
                          )}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
