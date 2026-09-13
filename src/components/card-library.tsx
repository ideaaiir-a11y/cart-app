"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Braces,
  Coins,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Layers,
  Library,
  Loader2,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  apiJson,
  faNum,
  themeLabel,
  toErrorMessage,
  CARD_THEME_OPTIONS,
  tagColor,
} from "@/components/shared";

/* ─── انواع ─────────────────────────────────────────────────── */

interface LibraryCard {
  id: string;
  jobId: string;
  rawInput: string;
  name: string;
  nameEn: string;
  price: string;
  priceValue: number;
  link: string;
  theme: string;
  tags: string[];
  specsCount: number;
  hasUsage: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface LibraryResponse {
  ok: boolean;
  total: number;
  cards: LibraryCard[];
  themes: { theme: string; count: number }[];
  tags: { name: string; count: number }[];
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "name", label: "بر اساس نام" },
  { value: "price-asc", label: "ارزان‌ترین اول" },
  { value: "price-desc", label: "گران‌ترین اول" },
];

const PAGE_SIZE = 24;

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function buildLibraryCsv(cards: LibraryCard[]): string {
  const header = [
    "نام محصول",
    "نام لاتین",
    "قیمت (تومان)",
    "لینک مرجع",
    "تم قالب",
    "برچسب‌ها",
    "تعداد مشخصات",
    "روش مصرف",
    "تاریخ ایجاد",
  ];
  const rows = cards.map((c) => [
    c.name || c.rawInput,
    c.nameEn || "",
    c.priceValue || 0,
    c.link || "",
    themeLabel(c.theme),
    (c.tags || []).join("، "),
    c.specsCount,
    c.hasUsage ? "دارد" : "ندارد",
    new Date(c.createdAt).toLocaleDateString("fa-IR"),
  ]);
  const body = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return `\uFEFF${body}`;
}

function faDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/* ─── کاشی کارت کتابخانه ────────────────────────────────────── */

function LibraryCardTile({
  card,
  index,
  onDelete,
}: {
  card: LibraryCard;
  index: number;
  onDelete: (card: LibraryCard) => void;
}) {
  const swatch =
    CARD_THEME_OPTIONS.find((t) => t.key === card.theme)?.swatch ?? CARD_THEME_OPTIONS[0].swatch;

  const copyLink = async () => {
    const url = `${window.location.origin}/api/cards/${card.id}/share`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("لینک عمومی کارت کپی شد");
    } catch {
      toast.error("کپی لینک ناموفق بود");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.035, 0.4) }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-900/10"
    >
      {/* نوار رنگ تم */}
      <span
        className="h-1.5 w-full shrink-0"
        style={{ background: `linear-gradient(to left, ${swatch[0]}, ${swatch[0]}99)` }}
        aria-hidden
      />

      {/* پیش‌نمایش تنبل از صفحه عمومی کارت */}
      <a
        href={`/api/cards/${card.id}/share`}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block h-[240px] overflow-hidden bg-zinc-100 dark:bg-zinc-900"
        title={`مشاهده کارت «${card.name}»`}
      >
        <iframe
          src={`/api/cards/${card.id}/share`}
          title={`پیش‌نمایش کارت ${card.name}`}
          loading="lazy"
          sandbox=""
          className="pointer-events-none absolute left-1/2 top-0 h-[730px] w-[460px] -translate-x-1/2 border-0 bg-white"
          style={{ transform: "scale(0.5)", transformOrigin: "top center" }}
        />
        <span className="absolute inset-x-0 bottom-0 flex h-14 items-end justify-center bg-gradient-to-t from-black/45 to-transparent pb-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-1 text-[11px] font-medium text-white">
            <ExternalLink className="size-3" aria-hidden />
            مشاهده کامل
          </span>
        </span>
      </a>

      {/* اطلاعات */}
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h4 className="line-clamp-2 min-h-10 text-sm font-bold leading-6">
          {card.name || card.rawInput}
        </h4>
        {card.nameEn && (
          <p dir="ltr" className="truncate text-left text-[11px] text-muted-foreground">
            {card.nameEn}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          {card.priceValue > 0 ? (
            <Badge className="gap-1 rounded-full bg-gradient-to-l from-emerald-600 to-emerald-500 px-2.5 py-1 text-[11px] text-white shadow-sm">
              <Coins className="size-3" aria-hidden />
              {faNum(card.priceValue)} تومان
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px] text-muted-foreground">
              بدون قیمت
            </Badge>
          )}
          <Badge
            variant="outline"
            className="gap-1 rounded-full px-2 py-1 text-[10.5px]"
            style={{ borderColor: `${swatch[0]}55`, color: swatch[0] }}
          >
            <span className="size-1.5 rounded-full" style={{ background: swatch[0] }} aria-hidden />
            {themeLabel(card.theme)}
          </Badge>
          {card.specsCount > 0 && (
            <Badge variant="secondary" className="rounded-full px-2 py-1 text-[10.5px]">
              {faNum(card.specsCount)} مشخصه
            </Badge>
          )}
        </div>

        {(card.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.tags.slice(0, 3).map((t) => {
              const c = tagColor(t);
              return (
                <span
                  key={t}
                  className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.border}`}
                >
                  {t}
                </span>
              );
            })}
            {card.tags.length > 3 && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                +{faNum(card.tags.length - 3)}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-2.5">
          <span className="text-[10.5px] text-muted-foreground">{faDate(card.createdAt)}</span>
          <TooltipProvider delayDuration={250}>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-lg"
                    asChild
                  >
                    <a
                      href={`/api/jobs/${card.jobId}/download/${card.id}`}
                      download
                      title="دانلود HTML"
                    >
                      <Download className="size-3.5" aria-hidden />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent dir="rtl" className="text-xs">دانلود HTML</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-lg"
                    asChild
                  >
                    <a
                      href={`/api/jobs/${card.jobId}/download/${card.id}?format=json`}
                      download
                      title="دانلود JSON"
                    >
                      <Braces className="size-3.5" aria-hidden />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent dir="rtl" className="text-xs">دانلود JSON</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-lg"
                    onClick={() => void copyLink()}
                    title="کپی لینک عمومی"
                  >
                    <Copy className="size-3.5" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent dir="rtl" className="text-xs">کپی لینک عمومی</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    onClick={() => onDelete(card)}
                    title="حذف کارت"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent dir="rtl" className="text-xs">حذف کارت</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── دیالوگ کتابخانه کارت‌ها ───────────────────────────────── */

export function CardLibraryDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<LibraryResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [theme, setTheme] = React.useState("all");
  const [tag, setTag] = React.useState("all");
  const [sort, setSort] = React.useState("newest");
  const [deleting, setDeleting] = React.useState<LibraryCard | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const debounceRef = React.useRef<number | null>(null);

  const fetchLib = React.useCallback(
    async (query: string, themeVal: string, tagVal: string, sortVal: string) => {
      setLoading(true);
      try {
        const sp = new URLSearchParams();
        if (query.trim()) sp.set("q", query.trim());
        if (themeVal !== "all") sp.set("theme", themeVal);
        if (tagVal !== "all") sp.set("tag", tagVal);
        sp.set("sort", sortVal);
        sp.set("limit", String(PAGE_SIZE * 2));
        const res = await apiJson<LibraryResponse>(`/api/cards?${sp.toString()}`);
        setData(res);
      } catch (e) {
        toast.error("دریافت کتابخانه ناموفق بود", { description: toErrorMessage(e) });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // بارگذاری اولیه هنگام باز شدن + واکنش به فیلترها
  React.useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void fetchLib(q, theme, tag, sort);
    }, q ? 320 : 0);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [open, q, theme, tag, sort, fetchLib]);

  const cards = data?.cards ?? [];
  const excelParams = React.useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (theme !== "all") sp.set("theme", theme);
    if (tag !== "all") sp.set("tag", tag);
    sp.set("sort", sort);
    return sp.toString();
  }, [q, theme, tag, sort]);
  const priced = cards.filter((c) => c.priceValue > 0);
  const avgPrice = priced.length
    ? Math.round(priced.reduce((s, c) => s + c.priceValue, 0) / priced.length)
    : 0;

  const exportCsv = () => {
    if (!cards.length) return;
    const blob = new Blob([buildLibraryCsv(cards)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `library-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`فایل CSV با ${faNum(cards.length)} کارت دانلود شد`);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await apiJson(`/api/cards/${deleting.id}`, { method: "DELETE" });
      toast.success(`کارت «${deleting.name}» حذف شد`);
      setData((prev) =>
        prev
          ? {
              ...prev,
              total: Math.max(0, prev.total - 1),
              cards: prev.cards.filter((c) => c.id !== deleting.id),
            }
          : prev,
      );
    } catch (e) {
      toast.error("حذف کارت ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden rounded-3xl p-0 sm:max-w-6xl">
          {/* سربرگ گرادیانی */}
          <div className="relative shrink-0 overflow-hidden border-b bg-gradient-to-l from-emerald-50 via-transparent to-amber-50 px-6 pb-5 pt-6 dark:from-emerald-950/30 dark:to-amber-950/20">
            <span
              className="pointer-events-none absolute -left-10 -top-16 size-44 rounded-full bg-emerald-300/25 blur-3xl"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute -right-8 -bottom-20 size-40 rounded-full bg-amber-300/20 blur-3xl"
              aria-hidden
            />
            <DialogHeader className="relative text-right">
              <DialogTitle className="flex flex-wrap items-center gap-2.5 text-xl">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-600/25">
                  <Library className="size-5" aria-hidden />
                </span>
                کتابخانه کارت‌ها
                {data && (
                  <Badge className="rounded-full bg-emerald-600/10 px-3 py-1 text-xs text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    {faNum(data.total)} کارت
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-right">
                همه کارت‌های آماده همه پروسه‌ها در یک نما — جستجو، فیلتر و خروجی گرفتن
              </DialogDescription>
            </DialogHeader>

            {/* نوار ابزار */}
            <div className="relative mt-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-52 flex-1">
                <Search
                  className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="جستجو در نام فارسی، لاتین یا ورودی خام…"
                  className="h-10 rounded-xl bg-background/80 pr-9 pl-8 backdrop-blur"
                  aria-label="جستجوی کارت"
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="پاک‌کردن جستجو"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>

              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="h-10 w-40 rounded-xl bg-background/80 backdrop-blur" aria-label="فیلتر تم">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه تم‌ها</SelectItem>
                  {data?.themes.map((t, i) => (
                    <SelectItem key={`${t.theme}-${i}`} value={t.theme || "emerald"}>
                      {themeLabel(t.theme)} ({faNum(t.count)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-10 w-40 rounded-xl bg-background/80 backdrop-blur" aria-label="مرتب‌سازی">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger
                  className="h-10 w-40 rounded-xl bg-background/80 backdrop-blur"
                  aria-label="فیلتر برچسب"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Tags className="size-3.5 shrink-0 text-amber-600" aria-hidden />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه برچسب‌ها</SelectItem>
                  {(data?.tags ?? []).map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      {t.name} ({faNum(t.count)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                asChild
                variant="outline"
                size="sm"
                title="فایل اکسل استایل‌دار با شیت راست‌به‌چپ، سربرگ رنگی و شیت خلاصه آماری"
                className="h-10 gap-2 rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
              >
                <a href={`/api/cards/excel?${excelParams}`} download>
                  <FileSpreadsheet className="size-4 text-emerald-600" aria-hidden />
                  اکسل
                </a>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={!cards.length}
                className="h-10 gap-2 rounded-xl"
              >
                <FileSpreadsheet className="size-4 text-emerald-600" aria-hidden />
                CSV
              </Button>
            </div>

            {/* خلاصه آماری */}
            {cards.length > 0 && (
              <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Layers className="size-3" aria-hidden />
                  نمایش {faNum(cards.length)} از {faNum(data?.total ?? cards.length)} کارت
                </span>
                {priced.length > 0 && (
                  <>
                    <span className="flex items-center gap-1">
                      <Coins className="size-3" aria-hidden />
                      میانگین قیمت: {faNum(avgPrice)} تومان
                    </span>
                    <span>
                      قیمت‌دار: {faNum(priced.length)} کارت
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* بدنه اسکرول‌شونده */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
            {loading && !data ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3 rounded-2xl border p-3">
                    <Skeleton className="h-[220px] w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <span className="flex size-16 items-center justify-center rounded-3xl bg-muted shadow-inner">
                  <Library className="size-8 text-muted-foreground" aria-hidden />
                </span>
                <p className="font-bold">
                  {q || theme !== "all" || tag !== "all" ? "کارتی با این فیلترها پیدا نشد" : "هنوز کارتی ساخته نشده"}
                </p>
                <p className="max-w-72 text-xs leading-6 text-muted-foreground">
                  {q || theme !== "all" || tag !== "all"
                    ? "عبارت جستجو یا فیلترها را تغییر دهید"
                    : "پس از اولین پردازش موفق، همه کارت‌ها اینجا جمع می‌شوند"}
                </p>
                {(q || theme !== "all" || tag !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => {
                      setQ("");
                      setTheme("all");
                      setTag("all");
                    }}
                  >
                    پاک‌کردن فیلترها
                  </Button>
                )}
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
                  loading ? "opacity-50" : "opacity-100"
                }`}
              >
                {cards.map((card, i) => (
                  <LibraryCardTile
                    key={card.id}
                    card={card}
                    index={i}
                    onDelete={setDeleting}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* تأیید حذف */}
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف کارت «{deleting?.name}»؟</AlertDialogTitle>
            <AlertDialogDescription>
              این کارت برای همیشه حذف می‌شود و در خروجی‌های ZIP هم نخواهد بود. سایر کارت‌های پروسه
              دست‌نخورده می‌مانند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleteBusy}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              بله، حذف شود
            </AlertDialogAction>
            <AlertDialogCancel disabled={deleteBusy}>انصراف</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
