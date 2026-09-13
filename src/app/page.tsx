"use client";

import * as React from "react";
import { Rocket, Loader2, RefreshCw, Layers } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { HeroStrip } from "@/components/hero-strip";
import { InputSection } from "@/components/input-section";
import { SettingsSection } from "@/components/settings-section";
import { PipelinePanel } from "@/components/pipeline-panel";
import { OutputGallery } from "@/components/output-gallery";
import { StatsBar } from "@/components/stats-bar";
import { ChatWidget } from "@/components/chat-widget";
import { JobHistoryPanel } from "@/components/job-history";
import JobQueueStrip from "@/components/job-queue-strip";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  apiJson,
  faNum,
  LS_JOB_KEY,
  toErrorMessage,
  truthy,
  DEFAULT_CARD_THEME,
  type AssistantConfig,
  type CardWithHtml,
  type JobData,
  type WatermarkConfig,
} from "@/components/shared";

interface SettingsShape {
  watermarkText?: string;
  watermarkMode?: string;
  watermarkPos?: string;
  watermarkSize?: string;
  watermarkFont?: string;
  cardTheme?: string;
  priceMarkup?: number;
  priceRound?: number;
  assistantUrl?: string;
  assistantKey?: string;
  assistantModel?: string;
  useExternal?: unknown;
  baleTokenSet?: boolean;
  baleNotify?: boolean;
  baleChatSet?: boolean;
}

export default function HomePage() {
  /* ── ورودی‌ها ── */
  const [inputsText, setInputsText] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [imageUrls, setImageUrls] = React.useState<string[]>([]);

  /* ── تنظیمات ── */
  const [watermark, setWatermark] = React.useState<WatermarkConfig>({
    mode: "text",
    text: "",
    pos: "bottom-right",
    size: "medium",
    font: "vazirmatn",
    logoDataUrl: "",
    logoName: "",
  });
  const [assistant, setAssistant] = React.useState<AssistantConfig>({
    enabled: false,
    url: "",
    key: "",
    model: "",
  });
  const [cardTheme, setCardTheme] = React.useState<string>(DEFAULT_CARD_THEME);

  /* ── قیمت‌گذاری ── */
  const [priceMarkup, setPriceMarkup] = React.useState<number>(0);
  const [priceRound, setPriceRound] = React.useState<number>(1000);

  /* ── پردازش ── */
  const [job, setJob] = React.useState<JobData | null>(null);
  const [starting, setStarting] = React.useState(false);
  const prevStatusRef = React.useRef<string>("idle");

  /* ── چت ── */
  const [chatOpen, setChatOpen] = React.useState(false);
  const [selectedCard, setSelectedCard] = React.useState<CardWithHtml | null>(null);

  /* ── تاریخچه ── */
  const [historyKey, setHistoryKey] = React.useState(0);
  const [rerunningId, setRerunningId] = React.useState("");

  const inputLines = React.useMemo(
    () =>
      inputsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    [inputsText],
  );
  const totalInputs = inputLines.length + imageUrls.length + files.length;
  const busy = starting || job?.status === "running" || job?.status === "pending";
  const trackedRunning = job?.status === "running" || job?.status === "pending";

  /* ── دریافت وضعیت job ── */
  const fetchJob = React.useCallback(async (id: string, silent = false) => {
    try {
      const data = await apiJson<{ ok: boolean; job: JobData }>(
        `/api/jobs/${id}`,
      );
      const next = data.job;
      const prev = prevStatusRef.current;
      prevStatusRef.current = next.status;
      setJob(next);
      if (prev === "running" && next.status === "done") {
        toast.success("پردازش با موفقیت کامل شد؛ کارت‌ها آماده‌اند");
        setHistoryKey((k) => k + 1);
      }
      if (prev === "running" && next.status === "error") {
        toast.error("پردازش با خطا متوقف شد", {
          description: next.error || undefined,
        });
      }
    } catch (e) {
      if (!silent) {
        toast.error("دریافت وضعیت پردازش ناموفق بود", {
          description: toErrorMessage(e),
        });
      } else if (e instanceof Error && e.message.includes("404")) {
        window.localStorage.removeItem(LS_JOB_KEY);
      }
    }
  }, []);

  /* ── بازیابی اولیه: job قبلی + تنظیمات ذخیره‌شده ── */
  React.useEffect(() => {
    const saved = window.localStorage.getItem(LS_JOB_KEY);
    if (saved) {
      void fetchJob(saved, true);
    }
    apiJson<{ ok: boolean; settings: SettingsShape }>("/api/settings")
      .then(({ settings }) => {
        if (!settings) return;
        setWatermark((w) => ({
          ...w,
          mode: settings.watermarkMode === "logo" ? "logo" : "text",
          text: settings.watermarkText ?? w.text,
          pos: settings.watermarkPos || w.pos,
          size: settings.watermarkSize || w.size,
          font: settings.watermarkFont || w.font,
        }));
        if (settings.cardTheme) setCardTheme(settings.cardTheme);
        if (typeof settings.priceMarkup === "number") setPriceMarkup(settings.priceMarkup);
        if (typeof settings.priceRound === "number") setPriceRound(settings.priceRound);
        setAssistant((a) => ({
          ...a,
          url: settings.assistantUrl || a.url,
          key: settings.assistantKey || a.key,
          model: settings.assistantModel || a.model,
          enabled: truthy(settings.useExternal),
        }));
      })
      .catch(() => {});
  }, [fetchJob]);

  /* ── polling هر ۲ ثانیه هنگام اجرا ── */
  React.useEffect(() => {
    if (!job || (job.status !== "running" && job.status !== "pending")) return;
    const timer = window.setInterval(() => {
      void fetchJob(job.id, true);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [job, fetchJob]);

  /* ── همگام‌سازی کارت انتخابی با داده تازه ── */
  React.useEffect(() => {
    if (!selectedCard || !job) return;
    const fresh = job.cards.find((c) => c.id === selectedCard.id);
    if (fresh && fresh !== selectedCard) setSelectedCard(fresh);
  }, [job, selectedCard]);

  /* ── به‌روزرسانی درجای کارت پس از ویرایش دستی/تصویر تازه ── */
  const applyCardUpdate = React.useCallback((updated: CardWithHtml) => {
    setJob((prev) =>
      prev
        ? {
            ...prev,
            cards: prev.cards.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
          }
        : prev,
    );
  }, []);

  /* ── بازکردن پروسه از تاریخچه ── */
  const openJobFromHistory = React.useCallback(
    async (id: string) => {
      await fetchJob(id);
      window.localStorage.setItem(LS_JOB_KEY, id);
      prevStatusRef.current = "idle";
      window.setTimeout(() => {
        document
          .getElementById("pipeline")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      toast.info("پروسه بازگذاری شد");
    },
    [fetchJob],
  );

  /* ── اجرای مجدد پروسه از تاریخچه ── */
  const rerunJobFromHistory = React.useCallback(
    async (id: string) => {
      setRerunningId(id);
      try {
        await apiJson<{ ok: boolean }>(`/api/jobs/${id}/rerun`, { method: "POST" });
        window.localStorage.setItem(LS_JOB_KEY, id);
        prevStatusRef.current = "pending";
        setJob({
          id,
          status: "pending",
          currentStage: "",
          stages: [],
          error: "",
          cards: [],
        });
        toast.success("اجرای مجدد آغاز شد؛ مراحل از نو اجرا می‌شوند");
        window.setTimeout(() => {
          document
            .getElementById("pipeline")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
        void fetchJob(id, true);
        setHistoryKey((k) => k + 1);
      } catch (e) {
        toast.error("اجرای مجدد ناموفق بود", { description: toErrorMessage(e) });
      } finally {
        setRerunningId("");
      }
    },
    [fetchJob],
  );

  /* ── شروع پردازش (پشتیبانی از اجرای همزمان چند پروسه) ── */
  const startJob = async () => {
    if (totalInputs === 0) {
      toast.error("حداقل یک محصول وارد کنید");
      return;
    }
    setStarting(true);
    const parallel = trackedRunning;
    try {
      const fd = new FormData();
      fd.append("inputs", JSON.stringify([...inputLines, ...imageUrls]));
      files.forEach((f) => fd.append("files", f));
      fd.append("watermarkText", watermark.text);
      fd.append("watermarkMode", watermark.mode);
      fd.append("watermarkPos", watermark.pos);
      fd.append("watermarkSize", watermark.size || "medium");
      fd.append("watermarkFont", watermark.font || "vazirmatn");
      fd.append("cardTheme", cardTheme);
      if (watermark.mode === "logo" && watermark.logoDataUrl) {
        fd.append("watermarkLogo", watermark.logoDataUrl);
      }
      fd.append("useExternal", assistant.enabled ? "1" : "0");
      fd.append("assistantUrl", assistant.url);
      fd.append("assistantKey", assistant.key);
      fd.append("assistantModel", assistant.model);

      const { jobId } = await apiJson<{ ok: boolean; jobId: string }>(
        "/api/jobs",
        { method: "POST", body: fd },
      );
      await apiJson<{ ok: boolean }>(`/api/jobs/${jobId}/run`, {
        method: "POST",
      });

      window.localStorage.setItem(LS_JOB_KEY, jobId);
      prevStatusRef.current = "pending";
      setJob({
        id: jobId,
        status: "pending",
        currentStage: "",
        stages: [],
        error: "",
        cards: [],
      });
      if (parallel) {
        toast.info("پروسه جدید آغاز شد؛ پروسه قبلی در پس‌زمینه ادامه دارد");
      } else {
        toast.success("پردازش آغاز شد");
      }
      window.setTimeout(() => {
        document
          .getElementById("pipeline")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      void fetchJob(jobId, true);
    } catch (e) {
      toast.error("شروع پردازش ناموفق بود", {
        description: toErrorMessage(e),
      });
    } finally {
      setStarting(false);
    }
  };

  const scrollToSettings = () => {
    document
      .getElementById("settings")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const summaryText =
    totalInputs === 0
      ? "برای شروع، حداقل یک نام، لینک یا فایل محصول وارد کنید"
      : `${faNum(totalInputs)} ورودی آماده پردازش در ۶ مرحله خودکار است`;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader onSettingsClick={scrollToSettings} />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 pb-24 pt-6 md:px-6">
        <HeroStrip />

        {/* آمار کلی فروشگاه */}
        <StatsBar refreshKey={historyKey} />

        {/* فضای کاری دو ستونه */}
        <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <InputSection
              text={inputsText}
              onTextChange={setInputsText}
              files={files}
              onFilesAdd={(added) => setFiles((prev) => [...prev, ...added])}
              onFileRemove={(index) =>
                setFiles((prev) => prev.filter((_, i) => i !== index))
              }
              imageUrls={imageUrls}
              onImageUrlsChange={setImageUrls}
              disabled={starting}
            />
          </div>
          <SettingsSection
            watermark={watermark}
            onWatermarkChange={setWatermark}
            assistant={assistant}
            onAssistantChange={setAssistant}
            cardTheme={cardTheme}
            onCardThemeChange={setCardTheme}
            priceMarkup={priceMarkup}
            onPriceMarkupChange={setPriceMarkup}
            priceRound={priceRound}
            onPriceRoundChange={setPriceRound}
            disabled={starting}
          />
        </section>

        {/* دکمه شروع پردازش — حین اجرای پروسه دیگر هم فعال است */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="relative">
            {totalInputs > 0 && !starting && (
              <span
                className="absolute -inset-1.5 -z-10 animate-pulse rounded-2xl bg-gradient-to-l from-emerald-400/40 via-emerald-300/30 to-amber-300/40 blur-md"
                aria-hidden
              />
            )}
            <Button
              onClick={() => void startJob()}
              disabled={starting || totalInputs === 0}
              className="h-14 gap-3 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 px-10 text-lg font-bold text-white shadow-lg shadow-emerald-600/30 transition-all hover:from-emerald-700 hover:to-emerald-600 hover:shadow-emerald-600/40 active:scale-[0.98] disabled:from-zinc-400 disabled:to-zinc-400 disabled:shadow-none"
            >
              {starting ? (
                <Loader2 className="size-6 animate-spin" aria-hidden />
              ) : trackedRunning ? (
                <Layers className="size-6" aria-hidden />
              ) : (
                <Rocket className="size-6" aria-hidden />
              )}
              {starting
                ? "در حال ارسال…"
                : trackedRunning
                  ? "پردازش همزمان جدید"
                  : "شروع پردازش"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {trackedRunning && !starting
              ? "یک پروسه در حال اجراست؛ می‌توانید همزمان پروسه جدیدی نیز شروع کنید"
              : summaryText}
          </p>
        </div>

        {/* صف پردازش همزمان — چیپ‌های همه پروسه‌های فعال */}
        <JobQueueStrip
          activeJobId={job?.id ?? ""}
          onOpenJob={(id) => void openJobFromHistory(id)}
          refreshKey={historyKey}
        />

        {/* پروسه اجرا */}
        {job && <PipelinePanel job={job} />}

        {/* خروجی‌ها */}
        <OutputGallery
          jobId={job?.id ?? ""}
          cards={job?.cards.filter((c) => c.status === "done") ?? []}
          running={busy}
          onEditCard={(card) => {
            setSelectedCard(card);
            setChatOpen(true);
          }}
          onCardUpdated={applyCardUpdate}
          onBulkThemeApplied={() => {
            if (job) void fetchJob(job.id, true);
            setHistoryKey((k) => k + 1);
          }}
        />

        {/* تاریخچه پروسه‌ها */}
        <JobHistoryPanel
          refreshKey={historyKey}
          activeJobId={job?.id ?? ""}
          onOpenJob={(id) => void openJobFromHistory(id)}
          onRerunJob={(id) => void rerunJobFromHistory(id)}
          rerunningId={rerunningId}
        />

        {/* نوسازی دستی خروجی‌ها پس از اعمال ویرایش دستیار */}
        {job && job.cards.length > 0 && !busy && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => void fetchJob(job.id)}
              className="h-10 gap-2 rounded-xl text-muted-foreground transition-colors hover:text-emerald-700"
            >
              <RefreshCw className="size-4" aria-hidden />
              نوسازی خروجی‌ها
            </Button>
          </div>
        )}
      </main>

      <SiteFooter />

      <ChatWidget
        open={chatOpen}
        onOpenChange={setChatOpen}
        selectedCard={selectedCard}
        onClearCard={() => setSelectedCard(null)}
        onCardApplied={() => {
          if (job) void fetchJob(job.id, true);
          toast.info("خروجی‌ها در حال به‌روزرسانی است");
        }}
      />
    </div>
  );
}
