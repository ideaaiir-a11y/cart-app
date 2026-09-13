"use client";

import * as React from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Calculator,
  CalendarClock,
  Cable,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Eye,
  EyeOff,
  Globe,
  History,
  ImagePlus,
  KeyRound,
  Loader2,
  MessageSquareText,
  MonitorPlay,
  Palette,
  Play,
  RefreshCw,
  Save,
  Send,
  Server,
  ShieldCheck,
  Stamp,
  Trash2,
  TriangleAlert,
  BellRing,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  apiJson,
  faNum,
  toErrorMessage,
  CARD_THEME_OPTIONS,
  WATERMARK_POSITIONS,
  WATERMARK_SIZE_OPTIONS,
  WATERMARK_FONT_OPTIONS,
  type AssistantConfig,
  type WatermarkConfig,
} from "@/components/shared";

export interface SettingsSectionProps {
  watermark: WatermarkConfig;
  onWatermarkChange: (w: WatermarkConfig) => void;
  assistant: AssistantConfig;
  onAssistantChange: (a: AssistantConfig) => void;
  cardTheme: string;
  onCardThemeChange: (key: string) => void;
  priceMarkup: number;
  onPriceMarkupChange: (v: number) => void;
  priceRound: number;
  onPriceRoundChange: (v: number) => void;
  disabled?: boolean;
}

interface BaleInfo {
  username?: string;
  [key: string]: unknown;
}

interface BaleLogEntry {
  id: string;
  direction: string; // in | out
  chatId: string;
  userName: string;
  text: string;
  ok: boolean;
  error: string;
  createdAt: string;
}

/* ─── پیش‌نمایش کوچک هر تم ─────────────────────────────────── */

function ThemeMiniPreview({ swatch, dark }: { swatch: string[]; dark?: boolean }) {
  const [accent, soft, usage] = swatch;
  const bg = dark ? soft : "#ffffff";
  return (
    <div
      className="w-full rounded-lg border p-2.5 shadow-sm"
      style={{ background: bg, borderColor: dark ? "#2b3a52" : "#e5e7eb" }}
      aria-hidden
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="h-1.5 w-10 rounded-full" style={{ background: dark ? "#8fa1ba" : "#cbd5e1" }} />
        <span className="h-1.5 w-6 rounded-full" style={{ background: dark ? "#3b4c66" : "#e2e8f0" }} />
      </div>
      <div className="mb-1.5 h-8 rounded-md" style={{ background: dark ? "#223047" : "#f1f5f9" }} />
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold"
          style={{ background: dark ? "rgba(255,255,255,.08)" : soft, color: accent }}
        >
          ۱۲۳٬۰۰۰
        </span>
        <span className="h-1.5 w-12 rounded-full" style={{ background: usage, opacity: 0.55 }} />
      </div>
    </div>
  );
}

/* ─── کارت به‌روزرسانی خودکار شبانه قیمت‌ها ─────────────── */

interface AutoRepriceStatus {
  enabled: boolean;
  hour: number;
  ageDays: number;
  notify: boolean;
  lastDate: string;
  lastResult: {
    at: string;
    trigger: string;
    total: number;
    updated: number;
    confirmed: number;
    failed: number;
    skipped: boolean;
    note: string;
    details: { name: string; oldPrice: number; newPrice: number; ok: boolean; error?: string }[];
  } | null;
  eligible: number;
  nextRunAt: string;
}

const AUTO_HOUR_OPTIONS = [0, 2, 3, 4, 5, 6, 12, 18, 21, 22, 23];
const AUTO_AGE_OPTIONS = [1, 3, 7, 14, 30, 60, 90];

function faHour(h: number): string {
  return `${h.toLocaleString("fa-IR")}:۰۰`;
}

function faWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fa-IR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** کارت به‌روزرسانی خودکار شبانه قیمت‌ها — مستقل و با ذخیره فوری */
function AutoRepriceCard() {
  const [status, setStatus] = React.useState<AutoRepriceStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await apiJson<{ ok: boolean; status: AutoRepriceStatus }>("/api/auto-reprice");
      setStatus(data.status);
    } catch (e) {
      toast.error("دریافت وضعیت به‌روزرسانی خودکار ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // اجرای دستی در پس‌زمینه — polling تا تغییر نتیجه
  const pollResult = React.useRef<number | null>(null);
  React.useEffect(() => {
    return () => {
      if (pollResult.current) window.clearInterval(pollResult.current);
    };
  }, []);

  const runNow = async () => {
    setRunning(true);
    setShowDetails(true);
    const startedAt = Date.now();
    try {
      await apiJson("/api/auto-reprice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      toast.info("به‌روزرسانی قیمت‌ها در پس‌زمینه آغاز شد…");
      if (pollResult.current) window.clearInterval(pollResult.current);
      pollResult.current = window.setInterval(async () => {
        try {
          const data = await apiJson<{ ok: boolean; status: AutoRepriceStatus }>("/api/auto-reprice");
          if (data.status.lastResult && new Date(data.status.lastResult.at).getTime() > startedAt) {
            setStatus(data.status);
            setRunning(false);
            window.clearInterval(pollResult.current!);
            const r = data.status.lastResult!;
            toast.success(`به‌روزرسانی کامل شد — ${r.note}`, {
              description: `${r.total.toLocaleString("fa-IR")} کارت بررسی شد`,
            });
          } else if (Date.now() - startedAt > 4 * 60 * 1000) {
            setRunning(false);
            window.clearInterval(pollResult.current!);
            toast.error("اجرای به‌روزرسانی بیش از حد طول کشید — بعداً وضعیت را بررسی کنید");
          }
        } catch {
          /* keep polling */
        }
      }, 3500);
    } catch (e) {
      setRunning(false);
      toast.error("شروع اجرا ناموفق بود", { description: toErrorMessage(e) });
    }
  };

  const saveField = async (patch: Record<string, string>) => {
    try {
      await apiJson("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      void load();
    } catch (e) {
      toast.error("ذخیره تنظیم ناموفق بود", { description: toErrorMessage(e) });
    }
  };

  const r = status?.lastResult;

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-bl from-amber-50/90 to-white p-4 dark:border-amber-500/25 dark:from-amber-950/20 dark:to-card">
      <span
        className="pointer-events-none absolute -left-8 -top-10 size-28 rounded-full bg-amber-300/20 blur-2xl dark:bg-amber-500/10"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <CalendarClock className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
          به‌روزرسانی خودکار شبانه قیمت‌ها
          {status?.enabled && (
            <Badge className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">فعال</Badge>
          )}
        </p>
        <Switch
          checked={!!status?.enabled}
          onCheckedChange={(v) => void saveField({ autoReprice: v ? "1" : "0" })}
          aria-label="فعال‌سازی به‌روزرسانی خودکار شبانه"
          disabled={loading}
        />
      </div>
      <p className="relative mt-1 text-[11px] leading-5 text-muted-foreground">
        هر شب در ساعت مشخص، قیمت کارت‌های قدیمی‌تر از حد تعیین‌شده دوباره از سایت‌های مرجع جستجو
        و با حاشیه سود فعلی اعمال می‌شود (حداکثر ۱۲ کارت در هر شب) و در قیمت‌نگار ثبت می‌شود.
      </p>

      {status?.enabled && (
        <div className="relative mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-bold">ساعت اجرا</Label>
            <Select
              dir="rtl"
              value={String(status.hour)}
              onValueChange={(v) => void saveField({ autoRepriceHour: v })}
            >
              <SelectTrigger className="h-9 w-full rounded-lg" aria-label="ساعت اجرا">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTO_HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {faHour(h)}
                    {h >= 0 && h <= 5 ? " — نیمه‌شب/سحر" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold">کارت‌های قدیمی‌تر از</Label>
            <Select
              dir="rtl"
              value={String(status.ageDays)}
              onValueChange={(v) => void saveField({ autoRepriceAgeDays: v })}
            >
              <SelectTrigger className="h-9 w-full rounded-lg" aria-label="حداقل قدمت کارت">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTO_AGE_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d.toLocaleString("fa-IR")} روز
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end pb-0.5">
            <div className="w-full space-y-2 rounded-lg border bg-card/60 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-1 text-[11px] font-bold">
                  <BellRing className="size-3 text-amber-600" aria-hidden />
                  اعلان در بله
                </Label>
                <Switch
                  checked={status.notify}
                  onCheckedChange={(v) => void saveField({ autoRepriceNotify: v ? "1" : "0" })}
                  aria-label="اعلان بله"
                />
              </div>
              <p className="text-[10px] leading-4 text-muted-foreground">
                خلاصه تغییرات به چت ربات بله ارسال می‌شود
              </p>
            </div>
          </div>
        </div>
      )}

      {status?.enabled && (
        <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-white/70 px-3 py-2 text-[11px] dark:bg-black/20">
          <span className="flex items-center gap-1 font-semibold">
            <History className="size-3.5 text-amber-600" aria-hidden />
            آخرین اجرا:
            {r ? (
              <span className="font-normal">{faWhen(r.at)}</span>
            ) : (
              <span className="font-normal text-muted-foreground">هنوز اجرا نشده</span>
            )}
          </span>
          {r && (
            <span className="text-muted-foreground">{r.note}</span>
          )}
          <span className="text-muted-foreground">
            اجرای بعدی: <b className="font-semibold">{status ? faWhen(status.nextRunAt) : "—"}</b>
          </span>
          <span className="text-muted-foreground">
            واجدان شرط: <b className="font-semibold">{status.eligible.toLocaleString("fa-IR")} کارت</b>
          </span>
        </div>
      )}

      {status?.enabled && (
        <div className="relative mt-2.5 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => void runNow()}
            disabled={running}
            className="h-9 gap-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Play className="size-4" aria-hidden />
            )}
            {running ? "در حال به‌روزرسانی…" : "اجرای فوری"}
          </Button>
          {r && r.details.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetails((s) => !s)}
              className="h-9 gap-1.5 rounded-xl text-xs"
              aria-expanded={showDetails}
            >
              <ArrowDownLeft className={`size-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`} aria-hidden />
              جزئیات ({r.details.length.toLocaleString("fa-IR")})
            </Button>
          )}
        </div>
      )}

      {showDetails && r && r.details.length > 0 && (
        <div className="scrollbar-thin relative mt-2.5 max-h-44 space-y-1 overflow-y-auto rounded-lg border bg-card p-2">
          {r.details.map((d, i) => (
            <div
              key={`${d.name}-${i}`}
              className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                d.ok
                  ? d.oldPrice !== d.newPrice
                    ? "bg-emerald-50 dark:bg-emerald-950/30"
                    : "bg-muted/60"
                  : "bg-red-50 dark:bg-red-950/30"
              }`}
            >
              <span className="min-w-0 truncate font-semibold">{d.name}</span>
              {d.ok ? (
                d.oldPrice !== d.newPrice ? (
                  <span dir="ltr" className="shrink-0 font-bold text-emerald-700 dark:text-emerald-300">
                    {d.oldPrice.toLocaleString("fa-IR")} ← {d.newPrice.toLocaleString("fa-IR")}
                  </span>
                ) : (
                  <span className="shrink-0 text-muted-foreground">تأیید شد</span>
                )
              ) : (
                <span className="shrink-0 text-red-600 dark:text-red-400">{d.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── پنل لاگ پیام‌های ربات بله ─────────────────────────── */

function BaleLogsPanel() {
  const [open, setOpen] = React.useState(false);
  const [logs, setLogs] = React.useState<BaleLogEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ ok: boolean; logs: BaleLogEntry[] }>("/api/bale/logs?limit=30");
      setLogs(data.logs || []);
    } catch (e) {
      toast.error("دریافت لاگ پیام‌ها ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const clearLogs = async () => {
    setClearing(true);
    try {
      await apiJson("/api/bale/logs", { method: "DELETE" });
      setLogs([]);
      toast.success("لاگ پیام‌ها پاک شد");
    } catch (e) {
      toast.error("پاک کردن لاگ ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setClearing(false);
    }
  };

  const faTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("fa-IR", {
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
    <div className="rounded-xl border bg-muted/30">
      <div className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-right text-sm font-semibold transition-colors hover:text-emerald-700"
        >
          <MessageSquareText className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          لاگ پیام‌های ربات
          {logs.length > 0 && (
            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-normal">
              {logs.length.toLocaleString("fa-IR")} پیام اخیر
            </Badge>
          )}
          <span
            className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        {open && (
          <span className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-label="نوسازی لاگ"
              onClick={() => void load()}
              className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:text-emerald-700"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="پاک کردن لاگ"
              disabled={clearing || logs.length === 0}
              onClick={() => void clearLogs()}
              className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:text-red-600"
            >
              {clearing ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-3.5" aria-hidden />
              )}
            </Button>
          </span>
        )}
      </div>
      {open && (
        <div className="border-t px-3 pb-3 pt-2.5">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              در حال دریافت…
            </div>
          ) : logs.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
              هنوز پیامی رد و بدل نشده — از بله به ربات پیام دهید یا «پیام آزمایشی» بفرستید
            </p>
          ) : (
            <ul className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto pl-1">
              {logs.map((l) => {
                const isIn = l.direction === "in";
                return (
                  <li
                    key={l.id}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 ${
                      isIn
                        ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-950/20"
                        : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                        isIn
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                      title={isIn ? "پیام دریافتی از کاربر" : "پیام ارسالی ربات"}
                    >
                      {isIn ? (
                        <ArrowDownLeft className="size-3.5" aria-hidden />
                      ) : (
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[11px] font-bold">
                          {l.userName || (isIn ? "کاربر" : "ربات")}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{faTime(l.createdAt)}</span>
                        {!l.ok && (
                          <Badge
                            variant="outline"
                            className="rounded-full border-red-300 px-1.5 py-0 text-[9px] text-red-600 dark:border-red-500/40 dark:text-red-400"
                          >
                            خطا
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 whitespace-pre-line break-words text-xs leading-6 text-muted-foreground">
                        {l.text}
                      </p>
                      {l.error && (
                        <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">{l.error}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── پنل «ارتباط با برنامه» — دریافت درخواست‌ها از دستیار خارجی (API v1) ── */

interface V1Endpoint {
  method: "GET" | "POST";
  path: string;
  desc: string;
}

const V1_ENDPOINTS: V1Endpoint[] = [
  { method: "GET", path: "/api/v1/health", desc: "بررسی سلامت سرویس (بدون کلید)" },
  { method: "GET", path: "/api/v1", desc: "نمای کلی و فهرست مسیرها" },
  { method: "GET", path: "/api/v1/products?q=&limit=", desc: "فهرست کارت‌های محصول" },
  { method: "GET", path: "/api/v1/products/{id}", desc: "جزئیات کامل یک کارت" },
  { method: "POST", path: "/api/v1/generate", desc: "ساخت پروسه جدید — {\"input\":\"نام محصول\"}" },
  { method: "GET", path: "/api/v1/jobs/{id}", desc: "وضعیت پروسه و کارت‌ها (poll)" },
  { method: "POST", path: "/api/v1/chat", desc: "دستیار ویرایشگر — {\"message\":\"...\"}" },
];

function ApiConnectionPanel() {
  const [keyInfo, setKeyInfo] = React.useState<{ apiKey: string; masked: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [revealed, setRevealed] = React.useState(false);
  const [regenLoading, setRegenLoading] = React.useState(false);
  const [regenOpen, setRegenOpen] = React.useState(false);
  const [copyId, setCopyId] = React.useState("");
  const [origin, setOrigin] = React.useState("");
  const [health, setHealth] = React.useState<{
    checking: boolean;
    ok: boolean | null;
    latencyMs: number;
    error: string;
  }>({ checking: false, ok: null, latencyMs: 0, error: "" });

  React.useEffect(() => {
    setOrigin(window.location.origin);
    apiJson<{ ok: boolean; apiKey: string; masked: string }>("/api/apikey")
      .then((d) => setKeyInfo({ apiKey: d.apiKey, masked: d.masked }))
      .catch((e) =>
        toast.error("دریافت کلید API ناموفق بود", { description: toErrorMessage(e) }),
      )
      .finally(() => setLoading(false));
  }, []);

  const baseUrl = `${origin || "https://your-domain.com"}/api/v1`;
  const displayKey = keyInfo ? (revealed ? keyInfo.apiKey : keyInfo.masked) : "…";

  const copyValue = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyId(id);
      toast.success("کپی شد");
      window.setTimeout(() => setCopyId(""), 1800);
    } catch (e) {
      toast.error("کپی ناموفق بود", { description: toErrorMessage(e) });
    }
  };

  const regenerate = async () => {
    setRegenLoading(true);
    try {
      const d = await apiJson<{ ok: boolean; apiKey: string; masked: string }>(
        "/api/apikey",
        { method: "POST" },
      );
      setKeyInfo({ apiKey: d.apiKey, masked: d.masked });
      setRevealed(false);
      setRegenOpen(false);
      toast.success("کلید جدید ساخته شد", {
        description: "اتصال‌هایی که کلید قبلی را دارند باید کلید جدید را دریافت کنند",
      });
    } catch (e) {
      toast.error("بازتولید کلید ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setRegenLoading(false);
    }
  };

  const checkHealth = async () => {
    setHealth({ checking: true, ok: null, latencyMs: 0, error: "" });
    const t0 = performance.now();
    try {
      const d = await apiJson<{ ok: boolean }>("/api/v1/health");
      setHealth({
        checking: false,
        ok: Boolean(d.ok),
        latencyMs: Math.round(performance.now() - t0),
        error: "",
      });
    } catch (e) {
      setHealth({ checking: false, ok: false, latencyMs: 0, error: toErrorMessage(e) });
    }
  };

  const curlExample = `curl -X POST "${baseUrl}/generate" \\
  -H "Authorization: Bearer ${keyInfo?.apiKey || "<apiKey>"}" \\
  -H "Content-Type: application/json" \\
  -d '{"input":"ادکلن مردانه لاکوست"}'`;

  return (
    <div className="space-y-5">
      {/* ── دریافت درخواست‌ها ── */}
      <section className="space-y-3.5 rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Server className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold">دریافت درخواست‌ها</p>
              <p className="text-[11px] text-muted-foreground">
                وب‌سرویس عمومی نسخه ۱ برای اتصال دستیار خارجی و برنامه‌های شما
              </p>
            </div>
          </div>
          {!loading && keyInfo && (
            <Badge
              variant="outline"
              className="gap-1 rounded-full border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <ShieldCheck className="size-3" aria-hidden />
              فعال
            </Badge>
          )}
        </div>

        {/* Base URL */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Base URL</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              dir="ltr"
              value={baseUrl}
              className="h-10 flex-1 rounded-lg bg-background font-mono text-xs text-left"
              aria-label="آدرس پایه وب‌سرویس"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => void copyValue(baseUrl, "base")}
              className="size-10 shrink-0 rounded-lg"
              aria-label="کپی آدرس پایه"
              title="کپی"
            >
              {copyId === "base" ? (
                <Check className="size-4 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">API Key</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              readOnly
              dir="ltr"
              value={loading ? "…" : displayKey}
              className="h-10 min-w-36 flex-[1_1_9rem] rounded-lg bg-background font-mono text-xs text-left"
              aria-label="کلید API"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setRevealed((v) => !v)}
              disabled={loading}
              className="size-10 shrink-0 rounded-lg"
              aria-label={revealed ? "پنهان کردن کلید" : "نمایش کلید"}
              title={revealed ? "پنهان" : "نمایش"}
            >
              {revealed ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => void copyValue(keyInfo?.apiKey || "", "key")}
              disabled={loading || !keyInfo}
              className="size-10 shrink-0 rounded-lg"
              aria-label="کپی کلید"
              title="کپی"
            >
              {copyId === "key" ? (
                <Check className="size-4 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRegenOpen(true)}
              disabled={loading}
              className="h-10 shrink-0 gap-1.5 rounded-lg px-3 text-xs"
              aria-label="بازتولید کلید"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              بازتولید کلید
            </Button>
          </div>
          <p className="flex items-start gap-1.5 text-[10.5px] leading-5 text-muted-foreground">
            <KeyRound className="mt-0.5 size-3 shrink-0" aria-hidden />
            کلید را فقط به برنامه‌های مورد اعتماد بدهید؛ هر دارنده کلید به کارت‌های محصول
            دسترسی دارد. با بازتولید، کلید قبلی بلافاصله باطل می‌شود.
          </p>
        </div>

        {/* آزمون اتصال */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void checkHealth()}
            disabled={health.checking}
            className="h-9 gap-1.5 rounded-lg text-xs"
          >
            {health.checking ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Activity className="size-3.5" aria-hidden />
            )}
            آزمون اتصال
          </Button>
          {health.ok === true && (
            <Badge
              variant="outline"
              className="gap-1 rounded-full border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle2 className="size-3" aria-hidden />
              پاسخ سالم • {faNum(health.latencyMs)} میلی‌ثانیه
            </Badge>
          )}
          {health.ok === false && (
            <Badge
              variant="outline"
              className="gap-1 rounded-full border-red-300 bg-red-50 text-[10px] text-red-600 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-400"
            >
              <TriangleAlert className="size-3" aria-hidden />
              {health.error || "پاسخ دریافت نشد"}
            </Badge>
          )}
        </div>
      </section>

      {/* ── ارتباط با برنامه ── */}
      <section className="space-y-3 rounded-xl border border-dashed p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
            <Cable className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold">ارتباط با برنامه</p>
            <p className="text-[11px] text-muted-foreground">
              سه راه اتصال برنامه‌ها و دستیارهای خارجی به این ابزار
            </p>
          </div>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {/* ۱) وب‌سرویس REST */}
          <AccordionItem
            value="rest"
            className="rounded-lg border bg-background px-3.5 last:border-b"
          >
            <AccordionTrigger className="py-3 text-xs font-semibold hover:no-underline">
              <span className="flex items-center gap-2">
                <Globe className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                وب‌سرویس REST (JSON)
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3.5">
              <ul className="space-y-1.5">
                {V1_ENDPOINTS.map((ep) => (
                  <li key={`${ep.method}-${ep.path}`} className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0 font-mono text-[9px] ${
                        ep.method === "GET"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {ep.method}
                    </Badge>
                    <div className="min-w-0">
                      <code dir="ltr" className="block break-all text-left font-mono text-[10.5px]">
                        {ep.path}
                      </code>
                      <p className="text-[10px] text-muted-foreground">{ep.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold">نمونه درخواست ساخت کارت</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyValue(curlExample, "curl")}
                    className="h-7 gap-1 rounded-md px-2 text-[10px]"
                    aria-label="کپی نمونه curl"
                  >
                    {copyId === "curl" ? (
                      <Check className="size-3 text-emerald-600" aria-hidden />
                    ) : (
                      <Copy className="size-3" aria-hidden />
                    )}
                    کپی
                  </Button>
                </div>
                <pre
                  dir="ltr"
                  className="scrollbar-thin max-h-40 overflow-auto rounded-lg bg-zinc-900 p-3 text-left font-mono text-[10px] leading-5 text-emerald-300"
                >
                  {curlExample}
                </pre>
                <p className="text-[10px] leading-5 text-muted-foreground">
                  کلید را از هدر{" "}
                  <code dir="ltr" className="font-mono">
                    Authorization: Bearer
                  </code>{" "}
                  یا پارامتر{" "}
                  <code dir="ltr" className="font-mono">
                    ?apiKey=
                  </code>{" "}
                  بفرستید. پاسخ ساخت پروسه شامل{" "}
                  <code dir="ltr" className="font-mono">
                    poll
                  </code>{" "}
                  است؛ با آن وضعیت را تا اتمام بخوانید.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ۲) ویجت چت */}
          <AccordionItem
            value="widget"
            className="rounded-lg border bg-background px-3.5 last:border-b"
          >
            <AccordionTrigger className="py-3 text-xs font-semibold hover:no-underline">
              <span className="flex items-center gap-2">
                <Code2 className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden />
                ویجت چت برای سایت شما
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2.5 pb-3.5">
              <p className="text-[10.5px] leading-5 text-muted-foreground">
                همین دستیار را با یک خط کد در هر سایت دیگری جاسازی کنید؛ پنل چت با ظاهر
                برند شما باز می‌شود و به وب‌سرویس همین برنامه وصل است.
              </p>
              <WidgetSnippet />
            </AccordionContent>
          </AccordionItem>

          {/* ۳) وب‌هوک بله */}
          <AccordionItem
            value="bale"
            className="rounded-lg border bg-background px-3.5 last:border-b"
          >
            <AccordionTrigger className="py-3 text-xs font-semibold hover:no-underline">
              <span className="flex items-center gap-2">
                <Send className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
                وب‌هوک ربات بله
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2.5 pb-3.5">
              <p className="text-[10.5px] leading-5 text-muted-foreground">
                توکن ربات را در تب «بله» ثبت کنید؛ آدرس زیر به‌صورت خودکار روی سرور بله
                تنظیم می‌شود و پیام‌های ربات به همین برنامه می‌رسند.
              </p>
              <div className="flex items-center gap-2">
                <code
                  dir="ltr"
                  className="h-9 flex-1 truncate rounded-lg border bg-muted/50 px-3 text-left font-mono text-[11px] leading-9"
                >
                  {(origin || "https://your-domain.com") + "/api/bale/hook"}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    void copyValue(`${origin || "https://your-domain.com"}/api/bale/hook`, "bale")
                  }
                  className="size-9 shrink-0 rounded-lg"
                  aria-label="کپی آدرس وب‌هوک بله"
                  title="کپی"
                >
                  {copyId === "bale" ? (
                    <Check className="size-4 text-emerald-600" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* تأیید بازتولید */}
      <AlertDialog open={regenOpen} onOpenChange={setRegenOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>بازتولید کلید API؟</AlertDialogTitle>
            <AlertDialogDescription>
              کلید فعلی بلافاصله باطل می‌شود و همه برنامه‌ها و دستیارهایی که با کلید قبلی
              متصل هستند دیگر پاسخ نمی‌گیرند. باید کلید جدید را در آن‌ها به‌روزرسانی کنید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={() => void regenerate()}
              disabled={regenLoading}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {regenLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
              بله، کلید جدید بساز
            </AlertDialogAction>
            <AlertDialogCancel disabled={regenLoading}>انصراف</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── اسنیپت ویجت چت (کپی سریع) ─────────────────────────── */

function WidgetSnippet() {
  const [copied, setCopied] = React.useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
  const snippet = `<script\n  src="${origin}/api/embed/widget.js"\n  data-title="پشتیبانی فروشگاه"\n  data-pos="left"\n  data-accent="#059669"\n  defer\n></script>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("کد ویجت کپی شد");
      window.setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      toast.error("کپی ناموفق بود", { description: toErrorMessage(e) });
    }
  };

  return (
    <div className="space-y-1.5">
      <pre
        dir="ltr"
        className="scrollbar-thin max-h-28 overflow-auto rounded-lg bg-zinc-900 p-3 text-left font-mono text-[10px] leading-5 text-violet-300"
      >
        {snippet}
      </pre>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void copy()}
          className="h-7 gap-1 rounded-md px-2 text-[10px]"
          aria-label="کپی کد ویجت"
        >
          {copied ? (
            <Check className="size-3 text-emerald-600" aria-hidden />
          ) : (
            <Copy className="size-3" aria-hidden />
          )}
          کپی کد
        </Button>
      </div>
    </div>
  );
}

export function SettingsSection({
  watermark,
  onWatermarkChange,
  assistant,
  onAssistantChange,
  cardTheme,
  onCardThemeChange,
  priceMarkup,
  onPriceMarkupChange,
  priceRound,
  onPriceRoundChange,
  disabled,
}: SettingsSectionProps) {
  const [saving, setSaving] = React.useState(false);
  const [baleToken, setBaleToken] = React.useState("");
  const [showToken, setShowToken] = React.useState(false);
  const [baleLoading, setBaleLoading] = React.useState(false);
  const [baleConnected, setBaleConnected] = React.useState(false);
  const [baleInfo, setBaleInfo] = React.useState<BaleInfo | null>(null);
  const [baleError, setBaleError] = React.useState("");
  const [baleNotify, setBaleNotify] = React.useState(false);
  const [baleChatSet, setBaleChatSet] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [testSending, setTestSending] = React.useState(false);
  const [extTesting, setExtTesting] = React.useState(false);
  const [extTestInfo, setExtTestInfo] = React.useState<{
    viaLabel: string;
    latencyMs: number;
    model: string;
  } | null>(null);

  /* محاسبه نمونه زنده تب قیمت‌گذاری */
  const [sampleBase, setSampleBase] = React.useState<number>(500000);
  const sampleFinal = React.useMemo(() => {
    let v = sampleBase;
    if (priceMarkup > 0) v = Math.round(v * (1 + priceMarkup / 100));
    if (priceRound > 0) v = Math.round(v / priceRound) * priceRound;
    return Math.max(1000, v);
  }, [sampleBase, priceMarkup, priceRound]);

  /* پیش‌نمایش زنده واترمارک */
  const [wmPreviewUrl, setWmPreviewUrl] = React.useState("");
  const [wmPreviewLoading, setWmPreviewLoading] = React.useState(false);

  /* پیش‌نمایش زنده تم */
  const [previewTheme, setPreviewTheme] = React.useState(cardTheme);
  const [previewHtml, setPreviewHtml] = React.useState("");
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const previewCache = React.useRef<Map<string, string>>(new Map());

  // همگام‌سازی تم پیش‌نمایش با تم انتخابی
  React.useEffect(() => {
    setPreviewTheme(cardTheme);
  }, [cardTheme]);

  // بارگذاری HTML پیش‌نمایش برای تم فعال (با کش)
  React.useEffect(() => {
    let cancelled = false;
    const cached = previewCache.current.get(previewTheme);
    if (cached) {
      setPreviewHtml(cached);
      return;
    }
    setPreviewLoading(true);
    apiJson<{ ok: boolean; html: string }>(
      `/api/card-preview?theme=${encodeURIComponent(previewTheme)}`,
    )
      .then((data) => {
        if (cancelled) return;
        previewCache.current.set(previewTheme, data.html || "");
        setPreviewHtml(data.html || "");
      })
      .catch(() => {
        if (!cancelled) setPreviewHtml("");
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewTheme]);

  // بررسی وضعیت اتصال قبلی ربات بله
  React.useEffect(() => {
    let cancelled = false;
    apiJson<{ ok: boolean; tokenSet: boolean; lastInfo?: BaleInfo; chatSet?: boolean; notify?: boolean }>(
      "/api/bale/status",
    )
      .then((data) => {
        if (cancelled) return;
        setBaleConnected(Boolean(data.tokenSet));
        if (data.lastInfo) setBaleInfo(data.lastInfo);
        setBaleChatSet(Boolean(data.chatSet));
        setBaleNotify(Boolean(data.notify));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* پیش‌نمایش زنده واترمارک با debounce روی تغییر متن/موقعیت/اندازه */
  React.useEffect(() => {
    if (watermark.mode !== "text") {
      setWmPreviewUrl("");
      return;
    }
    const timer = window.setTimeout(() => {
      setWmPreviewLoading(true);
      const params = new URLSearchParams({
        text: watermark.text || "فروشگاه نمونه",
        pos: watermark.pos,
        size: watermark.size || "medium",
        font: watermark.font || "vazirmatn",
      });
      const img = new Image();
      img.onload = () => {
        setWmPreviewUrl(`/api/watermark-preview?${params.toString()}`);
        setWmPreviewLoading(false);
      };
      img.onerror = () => setWmPreviewLoading(false);
      img.src = `/api/watermark-preview?${params.toString()}`;
    }, 350);
    return () => window.clearTimeout(timer);
  }, [watermark.text, watermark.pos, watermark.size, watermark.font, watermark.mode]);

  /* ذخیره خودکار تنظیمات واترمارک (debounce) — بدون نیاز به دکمه ذخیره */
  const wmLoadedRef = React.useRef(false);
  React.useEffect(() => {
    if (!wmLoadedRef.current) {
      // اولین اجرا بعد از هایدریشن؛ بارگذاری تنظیمات ذخیره‌شده بعداً مقدار را تغییر می‌دهد
      wmLoadedRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      apiJson("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watermarkText: watermark.text,
          watermarkMode: watermark.mode,
          watermarkPos: watermark.pos,
          watermarkSize: watermark.size || "medium",
          watermarkFont: watermark.font || "vazirmatn",
        }),
      }).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [watermark.text, watermark.mode, watermark.pos, watermark.size, watermark.font]);

  /* ذخیره خودکار قیمت‌گذاری (debounce) — بدون نیاز به دکمه ذخیره */
  const pricingLoadedRef = React.useRef(false);
  React.useEffect(() => {
    if (!pricingLoadedRef.current) {
      pricingLoadedRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      apiJson("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceMarkup, priceRound }),
      }).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [priceMarkup, priceRound]);

  const posLabel =
    WATERMARK_POSITIONS.find((p) => p.value === watermark.pos)?.label ?? "";

  const saveSettings = async () => {
    setSaving(true);
    try {
      await apiJson("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watermarkText: watermark.text,
          watermarkMode: watermark.mode,
          watermarkPos: watermark.pos,
          watermarkSize: watermark.size || "medium",
          watermarkFont: watermark.font || "vazirmatn",
          cardTheme,
          assistantUrl: assistant.url,
          assistantKey: assistant.key,
          assistantModel: assistant.model,
          useExternal: assistant.enabled,
        }),
      });
      toast.success("تنظیمات با موفقیت ذخیره شد");
    } catch (e) {
      toast.error("ذخیره تنظیمات ناموفق بود", {
        description: toErrorMessage(e),
      });
    } finally {
      setSaving(false);
    }
  };

  /* ذخیره فوری تم هنگام انتخاب */
  const pickTheme = async (key: string) => {
    onCardThemeChange(key);
    try {
      await apiJson("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardTheme: key }),
      });
    } catch {
      /* بی‌صدا — انتخاب محلی حفظ می‌شود */
    }
  };

  /* سوییچ اعلان بله — ذخیره فوری */
  const toggleBaleNotify = async (v: boolean) => {
    const prev = baleNotify;
    setBaleNotify(v);
    try {
      await apiJson("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baleNotify: v ? "1" : "0" }),
      });
      toast.success(
        v
          ? baleChatSet
            ? "اعلان پایان پردازش در بله فعال شد"
            : "فعال شد — کافی است یک بار به ربات پیام دهید تا چت شما ثبت شود"
          : "اعلان بله غیرفعال شد",
      );
    } catch (e) {
      setBaleNotify(prev);
      toast.error("ذخیره وضعیت اعلان ناموفق بود", { description: toErrorMessage(e) });
    }
  };

  const sendTestMessage = async () => {
    setTestSending(true);
    try {
      await apiJson<{ ok: boolean }>("/api/bale/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      toast.success("پیام آزمایشی به چت ثبت‌شده ارسال شد — بله را بررسی کنید");
    } catch (e) {
      toast.error("ارسال پیام آزمایشی ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setTestSending(false);
    }
  };

  /* آزمون اتصال دستیار (داخلی یا خارجی) */
  const testAssistant = async () => {
    setExtTesting(true);
    try {
      const d = await apiJson<{
        ok: boolean;
        viaLabel: string;
        latencyMs: number;
        model: string;
        error?: string;
      }>("/api/assistant/test", { method: "POST" });
      setExtTestInfo({ viaLabel: d.viaLabel, latencyMs: d.latencyMs, model: d.model });
      toast.success(`اتصال دستیار سالم است (${d.viaLabel})`, {
        description: `${d.model} • ${faNum(d.latencyMs)} میلی‌ثانیه`,
      });
    } catch (e) {
      setExtTestInfo(null);
      toast.error("اتصال دستیار برقرار نشد", { description: toErrorMessage(e) });
    } finally {
      setExtTesting(false);
    }
  };

  const embedOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
  const embedSnippet = `<script\n  src="${embedOrigin}/api/embed/widget.js"\n  data-title="پشتیبانی فروشگاه"\n  data-pos="left"\n  data-accent="#059669"\n  defer\n></script>`;

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      toast.success("کد ویجت کپی شد");
      window.setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error("کپی ناموفق بود", { description: toErrorMessage(e) });
    }
  };

  const setupBale = async () => {
    const token = baleToken.trim();
    if (!token) {
      toast.error("توکن ربات بله را وارد کنید");
      return;
    }
    setBaleLoading(true);
    setBaleError("");
    try {
      const data = await apiJson<{
        ok: boolean;
        info?: BaleInfo;
        error?: string;
      }>("/api/bale/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (data.ok) {
        setBaleConnected(true);
        setBaleInfo(data.info ?? null);
        setBaleToken("");
        toast.success("ربات بله متصل شد و وب‌هوک ثبت گردید");
      } else {
        setBaleConnected(false);
        setBaleError(data.error ?? "اتصال ناموفق بود");
        toast.error("اتصال ربات بله ناموفق بود", {
          description: data.error,
        });
      }
    } catch (e) {
      setBaleConnected(false);
      setBaleError(toErrorMessage(e));
      toast.error("اتصال ربات بله ناموفق بود", {
        description: toErrorMessage(e),
      });
    } finally {
      setBaleLoading(false);
    }
  };

  const readLogo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      onWatermarkChange({
        ...watermark,
        logoDataUrl: String(reader.result ?? ""),
        logoName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card
      id="settings"
      className={`scroll-mt-24 ${disabled ? "pointer-events-none opacity-60" : undefined}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            <Stamp className="size-5" aria-hidden />
          </span>
          تنظیمات
        </CardTitle>
        <CardDescription>
          واترمارک، تم قالب، قیمت‌گذاری، دستیار خارجی، ربات بله و اتصال برنامه‌ها را پیکربندی کنید
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="watermark">
          <TabsList className="grid h-11 w-full grid-cols-6 rounded-xl">
            <TabsTrigger value="watermark" className="gap-1 rounded-lg px-1" title="واترمارک">
              <Stamp className="size-4 shrink-0" aria-hidden />
              <span className="text-[10px] sm:text-xs">واترمارک</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1 rounded-lg px-1" title="قیمت‌گذاری">
              <Calculator className="size-4 shrink-0" aria-hidden />
              <span className="text-[10px] sm:text-xs">قیمت</span>
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-1 rounded-lg px-1" title="قالب کارت">
              <Palette className="size-4 shrink-0" aria-hidden />
              <span className="text-[10px] sm:text-xs">قالب</span>
            </TabsTrigger>
            <TabsTrigger value="assistant" className="gap-1 rounded-lg px-1" title="دستیار خارجی">
              <Bot className="size-4 shrink-0" aria-hidden />
              <span className="text-[10px] sm:text-xs">دستیار</span>
            </TabsTrigger>
            <TabsTrigger value="bale" className="gap-1 rounded-lg px-1" title="ربات بله">
              <Send className="size-4 shrink-0" aria-hidden />
              <span className="text-[10px] sm:text-xs">بله</span>
            </TabsTrigger>
            <TabsTrigger value="connect" className="gap-1 rounded-lg px-1" title="ارتباط با برنامه و وب‌سرویس">
              <Cable className="size-4 shrink-0" aria-hidden />
              <span className="text-[10px] sm:text-xs">ارتباط</span>
            </TabsTrigger>
          </TabsList>

          {/* ── تب واترمارک ── */}
          <TabsContent value="watermark" className="mt-4 space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3.5">
              <div className="space-y-0.5">
                <Label htmlFor="logo-mode-switch" className="text-sm font-semibold">
                  استفاده از لوگو به‌جای متن
                </Label>
                <p className="text-xs text-muted-foreground">
                  {watermark.mode === "text"
                    ? "واترمارک متنی روی تصویر اعمال می‌شود"
                    : "تصویر لوگوی شما روی تصویر اعمال می‌شود"}
                </p>
              </div>
              <Switch
                id="logo-mode-switch"
                checked={watermark.mode === "logo"}
                onCheckedChange={(v) =>
                  onWatermarkChange({ ...watermark, mode: v ? "logo" : "text" })
                }
                aria-label="تغییر حالت واترمارک بین متن و لوگو"
              />
            </div>

            {watermark.mode === "text" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="watermark-text" className="text-sm font-semibold">
                    متن واترمارک
                  </Label>
                  <Input
                    id="watermark-text"
                    value={watermark.text}
                    onChange={(e) =>
                      onWatermarkChange({ ...watermark, text: e.target.value })
                    }
                    placeholder="مثلاً: فروشگاه آرایشی من"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">موقعیت واترمارک</Label>
                  <Select
                    dir="rtl"
                    value={watermark.pos}
                    onValueChange={(v) => onWatermarkChange({ ...watermark, pos: v })}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl">
                      <SelectValue placeholder="انتخاب موقعیت" />
                    </SelectTrigger>
                    <SelectContent>
                      {WATERMARK_POSITIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">اندازه واترمارک</Label>
                  <Select
                    dir="rtl"
                    value={watermark.size || "medium"}
                    onValueChange={(v) => onWatermarkChange({ ...watermark, size: v })}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl">
                      <SelectValue placeholder="انتخاب اندازه" />
                    </SelectTrigger>
                    <SelectContent>
                      {WATERMARK_SIZE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">قلم واترمارک</Label>
                  <Select
                    dir="rtl"
                    value={watermark.font || "vazirmatn"}
                    onValueChange={(v) => onWatermarkChange({ ...watermark, font: v })}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl">
                      <SelectValue placeholder="انتخاب قلم" />
                    </SelectTrigger>
                    <SelectContent>
                      {WATERMARK_FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          <span className="flex items-baseline justify-between gap-3">
                            <span
                              className={
                                f.value === "lalezar"
                                  ? "font-lalezar text-base"
                                  : f.value === "amiri"
                                    ? "font-amiri text-base"
                                    : f.value === "vazirmatn-black"
                                      ? "font-vazir-black"
                                      : ""
                              }
                            >
                              {f.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{f.hint}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    قلم روی تصویر کارت رندر می‌شود؛ پیش‌نمایش زنده زیر همان قلم را نشان می‌دهد.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">تصویر لوگو</Label>
                {watermark.logoDataUrl ? (
                  <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
                    <img
                      src={watermark.logoDataUrl}
                      alt="پیش‌نمایش لوگو"
                      className="size-14 rounded-lg border bg-white object-contain p-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" dir="ltr">
                        {watermark.logoName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        لوگو بارگذاری شد
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      onClick={() =>
                        onWatermarkChange({
                          ...watermark,
                          logoDataUrl: "",
                          logoName: "",
                        })
                      }
                      aria-label="حذف لوگو"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ) : (
                  <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/40 p-4 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20">
                    <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
                    <span className="text-sm text-muted-foreground">
                      انتخاب تصویر لوگو (PNG یا SVG شفاف)
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) readLogo(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            )}

            {/* پیش‌نمایش زنده واترمارک */}
            {watermark.mode === "text" && (
              <div className="overflow-hidden rounded-xl border shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-1.5" aria-hidden>
                    <span className="size-2.5 rounded-full bg-red-400" />
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    <span className="size-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                    <MonitorPlay className="size-3.5" aria-hidden />
                    پیش‌نمایش زنده واترمارک
                    {wmPreviewLoading && <Loader2 className="size-3 animate-spin text-emerald-600" aria-hidden />}
                  </p>
                </div>
                <div className="relative flex h-[220px] items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800">
                  {wmPreviewUrl ? (
                    <img
                      src={wmPreviewUrl}
                      alt="پیش‌نمایش واترمارک روی تصویر نمونه"
                      className="h-full w-auto object-cover transition-opacity duration-300"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      در حال آماده‌سازی پیش‌نمایش…
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-6 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              راهنما: {watermark.mode === "text" ? `متن «${watermark.text || "برند شما"}» ` : "لوگوی انتخابی "}
              به‌صورت <b>{posLabel}</b> روی تصویر اصلی هر کارت اعمال می‌شود.
            </p>
          </TabsContent>

          {/* ── تب قیمت‌گذاری (حاشیه سود + رُند قیمت) ── */}
          <TabsContent value="pricing" className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="price-markup" className="text-sm font-semibold">
                حاشیه سود روی قیمت منابع (درصد)
              </Label>
              <div className="flex gap-2" dir="ltr">
                <Input
                  id="price-markup"
                  type="number"
                  min={0}
                  max={90}
                  value={priceMarkup}
                  onChange={(e) => {
                    const n = Math.round(Number(e.target.value));
                    onPriceMarkupChange(isFinite(n) && n > 0 ? Math.min(90, n) : 0);
                  }}
                  className="h-11 rounded-xl text-center"
                />
                <span className="flex h-11 shrink-0 items-center rounded-xl bg-muted px-3 text-sm font-bold text-muted-foreground">
                  ٪
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[0, 5, 10, 15, 20, 30].map((p) => {
                  const active = priceMarkup === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onPriceMarkupChange(p)}
                      className={`h-8 rounded-full border px-3 text-[11px] font-bold transition-all ${
                        active
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-border bg-card text-muted-foreground hover:border-emerald-300 hover:text-foreground"
                      }`}
                    >
                      {p.toLocaleString("fa-IR")}٪
                      {p === 0 && <span className="mr-1 font-normal">(بدون سود)</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] leading-5 text-muted-foreground">
                قیمت میانه سایت‌های مرجع در این درصد ضرب می‌شود؛ قیمت ارسالی خودتان دست‌نخورده می‌ماند.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">رُند کردن قیمت نهایی</Label>
              <Select
                dir="rtl"
                value={String(priceRound)}
                onValueChange={(v) => onPriceRoundChange(Number(v))}
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="انتخاب گام رُند" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">رُند هزار تومان — پیشنهادی</SelectItem>
                  <SelectItem value="5000">رُند پنج‌هزار تومان</SelectItem>
                  <SelectItem value="10000">رُند ده‌هزار تومان</SelectItem>
                  <SelectItem value="0">بدون رُند — دقیق</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* محاسبه نمونه زنده */}
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-bl from-emerald-50/80 to-white p-3.5 dark:border-emerald-500/25 dark:from-emerald-950/25 dark:to-card">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold">
                <Calculator className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                محاسبه نمونه — قیمت منبع {sampleBase.toLocaleString("fa-IR")} تومان
              </p>
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="space-y-0.5">
                  <p className="text-[11px] text-muted-foreground">قیمت شما</p>
                  <p className="bg-gradient-to-l from-emerald-700 to-emerald-500 bg-clip-text text-xl font-black text-transparent dark:from-emerald-400 dark:to-emerald-300">
                    {sampleFinal.toLocaleString("fa-IR")} تومان
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full border-emerald-300 bg-white/70 px-2.5 py-1 text-[10px] dark:bg-emerald-950/30"
                >
                  {priceMarkup > 0
                    ? `+${priceMarkup.toLocaleString("fa-IR")}٪ سود`
                    : "بدون سود"}
                  {priceRound > 0
                    ? ` • رُند ${priceRound.toLocaleString("fa-IR")}`
                    : " • بی‌رُند"}
                </Badge>
              </div>
              <input
                type="range"
                min={100000}
                max={5000000}
                step={50000}
                value={sampleBase}
                onChange={(e) => setSampleBase(Number(e.target.value))}
                aria-label="قیمت پایه نمونه"
                className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-emerald-200 accent-emerald-600 dark:bg-emerald-900"
              />
            </div>

            <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-6 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              این تنظیمات روی همه <b>پروسه‌های جدید</b> و دکمه «قیمت روز» هر کارت اعمال می‌شود؛ ذخیره خودکار است.
            </p>

            {/* به‌روزرسانی خودکار شبانه قیمت‌ها */}
            <AutoRepriceCard />
          </TabsContent>

          {/* ── تب قالب کارت (تم‌های رنگی + پیش‌نمایش زنده) ── */}
          <TabsContent value="theme" className="mt-4 space-y-4">
            <p className="text-xs leading-6 text-muted-foreground">
              تم رنگی قالب کارت‌های خروجی را انتخاب کنید؛ رنگ قیمت، جدول مشخصات،
              روش مصرف و دکمه لینک مطابق تم رندر می‌شود. انتخاب فوراً ذخیره می‌شود.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {CARD_THEME_OPTIONS.map((t) => {
                const active = cardTheme === t.key;
                const hovered = previewTheme === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => void pickTheme(t.key)}
                    onMouseEnter={() => setPreviewTheme(t.key)}
                    onFocus={() => setPreviewTheme(t.key)}
                    aria-pressed={active}
                    className={`group relative flex flex-col gap-2 rounded-xl border-2 p-2.5 text-right outline-none transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      active
                        ? "border-emerald-500 bg-emerald-50/70 shadow-sm dark:bg-emerald-950/30"
                        : hovered
                          ? "border-emerald-300 bg-card shadow-sm"
                          : "border-border bg-card hover:border-emerald-300"
                    }`}
                  >
                    {active && (
                      <CheckCircle2
                        className="absolute left-2 top-2 size-4 text-emerald-600 dark:text-emerald-400"
                        aria-hidden
                      />
                    )}
                    <ThemeMiniPreview swatch={t.swatch} dark={t.key === "midnight"} />
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      <span
                        className="inline-block size-3 rounded-full ring-1 ring-black/10"
                        style={{ background: t.swatch[0] }}
                        aria-hidden
                      />
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* پیش‌نمایش زنده قالب */}
            <div className="overflow-hidden rounded-xl border shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2">
                <div className="flex items-center gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-red-400" />
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                </div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <MonitorPlay className="size-3.5" aria-hidden />
                  پیش‌نمایش زنده — تم {CARD_THEME_OPTIONS.find((t) => t.key === previewTheme)?.label ?? ""}
                </p>
              </div>
              <div
                className="relative flex h-[300px] justify-center overflow-hidden"
                style={{
                  background:
                    previewTheme === "midnight" ? "#0b1220" : "#f3f4f6",
                }}
              >
                {previewHtml ? (
                  <iframe
                    srcDoc={previewHtml}
                    title="پیش‌نمایش زنده قالب کارت"
                    sandbox=""
                    loading="lazy"
                    className="pointer-events-none h-[764px] w-[480px] shrink-0 border-0 bg-white"
                    style={{ transform: "scale(0.62)", transformOrigin: "top center" }}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    در حال آماده‌سازی پیش‌نمایش…
                  </div>
                )}
                {previewLoading && previewHtml && (
                  <div className="absolute inset-x-0 top-0 flex justify-center bg-background/70 py-1.5 backdrop-blur-sm">
                    <Loader2 className="size-3.5 animate-spin text-emerald-600" aria-hidden />
                  </div>
                )}
              </div>
            </div>
            <p className="text-[11px] leading-5 text-muted-foreground">
              نشانگر را روی هر تم نگه دارید تا پیش‌نمایش زنده تغییر کند؛ با کلیک، آن تم ذخیره می‌شود.
            </p>

            <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs leading-6 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              تم انتخاب‌شده روی همه کارت‌های <b>پردازش بعدی</b> اعمال می‌شود. برای تغییر
              یکجای تم کارت‌های موجود، از دکمه «تغییر گروهی تم» در بخش خروجی‌ها استفاده کنید.
            </p>
          </TabsContent>

          {/* ── تب دستیار خارجی + ویجت ── */}
          <TabsContent value="assistant" className="mt-4 space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3.5">
              <div className="space-y-0.5">
                <Label htmlFor="external-switch" className="text-sm font-semibold">
                  اتصال به دستیار هوشمند خارجی
                </Label>
                <p className="text-xs text-muted-foreground">
                  در صورت فعال بودن، درخواست‌های ویرایش به سرویس شما ارسال می‌شود
                </p>
              </div>
              <Switch
                id="external-switch"
                checked={assistant.enabled}
                onCheckedChange={(v) =>
                  onAssistantChange({ ...assistant, enabled: v })
                }
                aria-label="فعال یا غیرفعال کردن دستیار خارجی"
              />
            </div>

            <div className={`space-y-4 ${assistant.enabled ? "" : "pointer-events-none opacity-50"}`}>
              <div className="space-y-2">
                <Label htmlFor="assistant-url" className="text-sm font-semibold">
                  Base URL
                </Label>
                <Input
                  id="assistant-url"
                  value={assistant.url}
                  onChange={(e) =>
                    onAssistantChange({ ...assistant, url: e.target.value })
                  }
                  placeholder="https://api.example.com/v1"
                  dir="ltr"
                  className="h-11 rounded-xl text-left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assistant-key" className="text-sm font-semibold">
                  کلید API
                </Label>
                <Input
                  id="assistant-key"
                  type="password"
                  value={assistant.key}
                  onChange={(e) =>
                    onAssistantChange({ ...assistant, key: e.target.value })
                  }
                  placeholder="sk-..."
                  dir="ltr"
                  autoComplete="off"
                  className="h-11 rounded-xl text-left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assistant-model" className="text-sm font-semibold">
                  نام مدل
                </Label>
                <Input
                  id="assistant-model"
                  value={assistant.model}
                  onChange={(e) =>
                    onAssistantChange({ ...assistant, model: e.target.value })
                  }
                  placeholder="gpt-4o-mini"
                  dir="ltr"
                  className="h-11 rounded-xl text-left"
                />
              </div>
              <Button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="h-11 w-full gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" aria-hidden />
                )}
                ذخیره تنظیمات
              </Button>
            </div>

            {/* آزمون اتصال — خارج از ناحیه قفل، چون دستیار داخلی هم آزموده می‌شود */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3.5 py-3">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold">آزمون اتصال دستیار</p>
                <p className="text-[10.5px] text-muted-foreground">
                  اگر دستیار خارجی فعال باشد همان سرویس آزموده می‌شود؛ در غیر این صورت دستیار داخلی
                </p>
              </div>
              <div className="flex items-center gap-2">
                {extTestInfo && (
                  <Badge
                    variant="outline"
                    className="gap-1 rounded-full border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="size-3" aria-hidden />
                    {extTestInfo.viaLabel} • {faNum(extTestInfo.latencyMs)} میلی‌ثانیه
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void testAssistant()}
                  disabled={extTesting}
                  className="h-9 gap-1.5 rounded-lg px-3 text-xs"
                  aria-label="آزمون اتصال دستیار"
                  title="آزمون اتصال دستیار (داخلی یا خارجی)"
                >
                  {extTesting ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Activity className="size-3.5" aria-hidden />
                  )}
                  آزمون
                </Button>
              </div>
            </div>

            {/* ── ویجت چت برای وب‌سایت ── */}
            <div className="space-y-3 rounded-xl border border-dashed p-3.5">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                  <Code2 className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold">ویجت چت برای وب‌سایت شما</p>
                  <p className="text-[11px] text-muted-foreground">
                    همین دستیار را با یک خط کد در هر سایت دیگری جاسازی کنید
                  </p>
                </div>
              </div>
              <pre
                dir="ltr"
                className="scrollbar-thin max-h-32 overflow-auto rounded-lg bg-zinc-900 p-3 text-left font-mono text-[11px] leading-5 text-emerald-300"
              >
                {embedSnippet}
              </pre>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10.5px] leading-5 text-muted-foreground">
                  <code dir="ltr" className="font-mono">data-pos</code> چپ/راست،{" "}
                  <code dir="ltr" className="font-mono">data-accent</code> رنگ،{" "}
                  <code dir="ltr" className="font-mono">data-title</code> عنوان و{" "}
                  <code dir="ltr" className="font-mono">data-welcome</code> پیام خوش‌آمد را تعیین می‌کند.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void copySnippet()}
                  className="h-9 shrink-0 gap-1.5 rounded-lg bg-violet-600 text-xs text-white hover:bg-violet-700"
                >
                  {copied ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Copy className="size-3.5" aria-hidden />
                  )}
                  کپی کد
                </Button>
              </div>
              <Badge
                variant="outline"
                className="rounded-full border-violet-300 bg-violet-50 text-[10px] text-violet-700 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-300"
              >
                سازگار با هر سایت (CORS فعال)
              </Badge>
            </div>
          </TabsContent>

          {/* ── تب ربات بله ── */}
          <TabsContent value="bale" className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="bale-token" className="text-sm font-semibold">
                توکن ربات بله
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="bale-token"
                    type={showToken ? "text" : "password"}
                    value={baleToken}
                    onChange={(e) => setBaleToken(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void setupBale();
                      }
                    }}
                    placeholder="123456:ABC-DEF..."
                    dir="ltr"
                    autoComplete="off"
                    className="h-11 rounded-xl pl-11 text-left"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((s) => !s)}
                    aria-label={showToken ? "پنهان کردن توکن" : "نمایش توکن"}
                    className="absolute inset-y-0 left-0 flex w-11 items-center justify-center rounded-l-xl text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showToken ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
                <Button
                  type="button"
                  onClick={() => void setupBale()}
                  disabled={baleLoading || !baleToken.trim()}
                  className="h-11 shrink-0 gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {baleLoading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="size-4" aria-hidden />
                  )}
                  ثبت وب‌هوک و اتصال
                </Button>
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                با ثبت وب‌هوک، پیام‌های ربات شما از tapi.bale.ai به این سرور
                ارسال می‌شود و دستیار هوشمند به مشتریان پاسخ می‌دهد. توکن را از
                BotFather بله دریافت کنید.
              </p>
            </div>

            {baleConnected && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="space-y-0.5">
                  <p className="font-semibold">
                    ربات متصل است
                    {typeof baleInfo?.username === "string" && (
                      <span dir="ltr" className="font-mono">
                        {" "}
                        @{baleInfo.username.replace(/^@/, "")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs opacity-80">
                    وب‌هوک فعال است و پیام‌ها دریافت می‌شوند.
                  </p>
                </div>
              </div>
            )}

            {baleConnected && (
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3.5">
                <div className="space-y-0.5">
                  <Label htmlFor="bale-notify-switch" className="flex items-center gap-2 text-sm font-semibold">
                    <BellRing className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    اعلان پایان پردازش در بله
                  </Label>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {baleChatSet
                      ? "پس از اتمام هر پروسه، خلاصه کارت‌ها و قیمت‌ها به چت شما ارسال می‌شود"
                      : "برای دریافت اعلان، یک بار در بله به ربات خود پیام دهید تا چت شما ثبت شود"}
                  </p>
                </div>
                <Switch
                  id="bale-notify-switch"
                  checked={baleNotify}
                  onCheckedChange={(v) => void toggleBaleNotify(v)}
                  aria-label="فعال یا غیرفعال کردن اعلان پایان پردازش در بله"
                />
              </div>
            )}

            {baleConnected && (
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3.5">
                <div className="space-y-0.5">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Send className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    پیام آزمایشی
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {baleChatSet
                      ? "یک پیام تست به چت ثبت‌شده شما ارسال می‌کند تا از سلامت اتصال مطمئن شوید"
                      : "برای فعال شدن دکمه، یک بار در بله به ربات پیام دهید"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={testSending || !baleChatSet}
                  onClick={() => void sendTestMessage()}
                  className="h-9 shrink-0 gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {testSending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Send className="size-3.5" aria-hidden />
                  )}
                  ارسال پیام آزمایشی
                </Button>
              </div>
            )}

            {baleConnected && <BaleLogsPanel />}

            {!baleConnected && baleError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="space-y-0.5">
                  <p className="font-semibold">اتصال برقرار نشد</p>
                  <p className="text-xs">{baleError}</p>
                </div>
              </div>
            )}

            {baleConnected && (
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                وب‌هوک فعال
              </Badge>
            )}
          </TabsContent>

          {/* ── تب ارتباط با برنامه (وب‌سرویس عمومی) ── */}
          <TabsContent value="connect" className="mt-4">
            <ApiConnectionPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
