import {
  Coins,
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  ShieldCheck,
  Tags,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import type { CardData } from "@/lib/types";

/* ─── انواع مشترک فرانت ─────────────────────────────────────── */

export type StageStatus = "pending" | "running" | "done" | "error";
export type JobStatus = "pending" | "running" | "done" | "error";

export interface StageState {
  key: string;
  title?: string;
  status: StageStatus;
  logs?: string[];
  startedAt?: string;
  endedAt?: string;
}

/** CardData به‌علاوه HTML رندرشده که سرور هنگام status=done برمی‌گرداند */
export type CardWithHtml = CardData & {
  html?: string;
  hasEn?: boolean;
  theme?: string;
  tags?: string[];
};

export interface JobData {
  id: string;
  status: JobStatus;
  currentStage: string;
  stages: StageState[];
  error: string;
  cardTheme?: string;
  cards: CardWithHtml[];
}

export interface WatermarkConfig {
  mode: "text" | "logo";
  text: string;
  pos: string;
  size: string; // small | medium | large
  font: string; // vazirmatn | vazirmatn-black | lalezar | amiri
  logoDataUrl: string;
  logoName: string;
}

export interface AssistantConfig {
  enabled: boolean;
  url: string;
  key: string;
  model: string;
}

/* ─── ثابت‌ها ───────────────────────────────────────────────── */

export const LS_JOB_KEY = "cardmaker.jobId";
export const LS_SESSION_KEY = "cardmaker.sessionId";

export const WATERMARK_POSITIONS: { value: string; label: string }[] = [
  { value: "bottom-right", label: "پایین-راست" },
  { value: "bottom-left", label: "پایین-چپ" },
  { value: "top-right", label: "بالا-راست" },
  { value: "top-left", label: "بالا-چپ" },
  { value: "center", label: "مرکز" },
  { value: "repeat-diagonal", label: "مورب تکرارشونده" },
];

export const WATERMARK_SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: "small", label: "کوچک — ظریف و کم‌دمدخل" },
  { value: "medium", label: "متوسط — استاندارد" },
  { value: "large", label: "بزرگ — پررنگ و خوانا" },
];

/** قلم‌های واترمارک — هماهنگ با src/lib/watermark.ts */
export const WATERMARK_FONT_OPTIONS: {
  value: string;
  label: string;
  hint: string;
  cssFont: string;
}[] = [
  {
    value: "vazirmatn",
    label: "وزیرمتن",
    hint: "استاندارد و مدرن",
    cssFont: '"Vazirmatn", sans-serif',
  },
  {
    value: "vazirmatn-black",
    label: "وزیرمتن سیاه",
    hint: "پهن و پررنگ",
    cssFont: '"Vazirmatn", sans-serif',
  },
  {
    value: "lalezar",
    label: "لاله‌زار",
    hint: "نمایشی و تبلیغاتی",
    cssFont: '"Lalezar", "Vazirmatn", sans-serif',
  },
  {
    value: "amiri",
    label: "امیری",
    hint: "کلاسیک نسخ‌نویس",
    cssFont: '"Amiri", "Vazirmatn", serif',
  },
];

export function watermarkFontCss(key?: string): string {
  return (
    WATERMARK_FONT_OPTIONS.find((f) => f.value === key)?.cssFont ??
    WATERMARK_FONT_OPTIONS[0].cssFont
  );
}

/** تم‌های رنگی قالب کارت — هماهنگ با src/lib/card-themes.ts */
export const CARD_THEME_OPTIONS: {
  key: string;
  label: string;
  swatch: string[];
}[] = [
  { key: "emerald", label: "زمردی", swatch: ["#16a34a", "#f0fdf4", "#854d0e"] },
  { key: "rose", label: "سرخابی", swatch: ["#e11d48", "#fff1f2", "#9f1239"] },
  { key: "violet", label: "بنفش", swatch: ["#7c3aed", "#f5f3ff", "#5b21b6"] },
  { key: "amber", label: "طلایی", swatch: ["#b45309", "#fffbeb", "#78350f"] },
  { key: "teal", label: "فیروزه‌ای", swatch: ["#0d9488", "#f0fdfa", "#115e59"] },
  { key: "midnight", label: "شبانه", swatch: ["#34d399", "#1e293b", "#0f172a"] },
];

export const DEFAULT_CARD_THEME = "emerald";

/** رنگ ثابت بر اساس نام برچسب — پالت هماهنگ با اپ */
const TAG_PALETTE: { bg: string; border: string }[] = [
  { bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-500/30" },
  { bg: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300", border: "border-amber-200 dark:border-amber-500/30" },
  { bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300", border: "border-rose-200 dark:border-rose-500/30" },
  { bg: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300", border: "border-violet-200 dark:border-violet-500/30" },
  { bg: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300", border: "border-teal-200 dark:border-teal-500/30" },
  { bg: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300", border: "border-orange-200 dark:border-orange-500/30" },
];

export function tagColor(name: string): { bg: string; border: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

export function themeLabel(key?: string): string {
  return (
    CARD_THEME_OPTIONS.find((t) => t.key === key)?.label ??
    CARD_THEME_OPTIONS[0].label
  );
}

export const STAGE_ICONS: Record<string, LucideIcon> = {
  naming: Tags,
  pricing: Coins,
  images: ImageIcon,
  verify: ShieldCheck,
  optimize: Wand2,
  build: LayoutGrid,
};

export const FALLBACK_STAGE_ICON: LucideIcon = LayoutGrid;

export const STAGE_STATUS_META: Record<
  StageStatus,
  { label: string; badge: string }
> = {
  pending: {
    label: "در انتظار",
    badge:
      "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  },
  running: {
    label: "در حال اجرا",
    badge:
      "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400",
  },
  done: {
    label: "انجام شد",
    badge:
      "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  error: {
    label: "خطا",
    badge:
      "border-red-300 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400",
  },
};

export const JOB_STATUS_META: Record<JobStatus, { label: string; badge: string }> =
  {
    pending: {
      label: "آماده‌سازی",
      badge: STAGE_STATUS_META.pending.badge,
    },
    running: {
      label: "در حال اجرا",
      badge: STAGE_STATUS_META.running.badge,
    },
    done: { label: "تکمیل شد", badge: STAGE_STATUS_META.done.badge },
    error: { label: "متوقف شد", badge: STAGE_STATUS_META.error.badge },
  };

/* ─── ابزارها ───────────────────────────────────────────────── */

/** نمایش اعداد به‌صورت فارسی */
export function faNum(n: number): string {
  return n.toLocaleString("fa-IR");
}

/** آیکون مناسب بر اساس پسوند فایل */
export function fileIcon(fileName: string): LucideIcon {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "html" || ext === "htm") return FileCode2;
  if (ext === "zip") return FileArchive;
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return FileImage;
  return FileText;
}

/** حجم خوانا به فارسی */
export function faFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${faNum(Math.round((bytes / (1024 * 1024)) * 10) / 10)} مگابایت`;
  return `${faNum(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;
}

/** فراخوانی امن API با پیام خطای فارسی */
export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok || (typeof data === "object" && data !== null && "ok" in data && (data as { ok?: boolean }).ok === false)) {
    const msg =
      typeof data === "object" && data !== null && "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `خطای سرور (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

/** استخراج پیام فارسی از خطای ناشناخته */
export function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "خطای ناشناخته‌ای رخ داد";
}

/** نرمال‌سازی مقدار boolean که ممکن است 0/1 یا "0"/"1" باشد */
export function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === "1";
}
