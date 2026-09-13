"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowDownWideNarrow,
  BookText,
  Braces,
  Check,
  CheckCircle2,
  Code2,
  Coins,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileSpreadsheet,
  Languages,
  Link2,
  Loader2,
  Maximize2,
  MoreHorizontal,
  PaintBucket,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  TrendingDown,
  TrendingUp,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardEditorDialog } from "@/components/card-editor-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  apiJson,
  faNum,
  themeLabel,
  tagColor,
  toErrorMessage,
  CARD_THEME_OPTIONS,
  type CardWithHtml,
} from "@/components/shared";
import type { PriceHistoryRow } from "@/lib/types";

/* ─── قیمت‌نگار: ابزارهای تاریخچه قیمت ─────────────────── */

const PRICE_SRC_FA: Record<string, string> = {
  pipeline: "پایپ‌لاین",
  reprice: "قیمت روز",
  bulk: "به‌روزرسانی گروهی",
  manual: "ویرایش دستی",
  assistant: "دستیار هوشمند",
  initial: "اولیه",
};

function faDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/** نشان تغییر قیمت نسبت به اولین ثبت — فقط وقتی تاریخچه واقعاً تغییر داشته */
function PriceDeltaBadge({ history }: { history: PriceHistoryRow[] }) {
  if (!history || history.length < 2) return null;
  const first = history[0].value;
  const last = history[history.length - 1].value;
  if (!first || last === first) return null;
  const pct = Math.round(((last - first) / first) * 100);
  if (pct === 0) return null;
  const up = pct > 0;
  return (
    <Badge
      variant="outline"
      title={`از ابتدا: ${first.toLocaleString("fa-IR")} تومان`}
      className={`gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        up
          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300"
          : "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-300"
      }`}
    >
      {up ? (
        <TrendingUp className="size-3" aria-hidden />
      ) : (
        <TrendingDown className="size-3" aria-hidden />
      )}
      {faNum(Math.abs(pct))}٪
    </Badge>
  );
}

/** نمودار خطی کوچک تاریخچه قیمت + فهرست آخرین تغییرات */
function PriceSparkline({ history }: { history: PriceHistoryRow[] }) {
  const rows = (history || []).filter((r) => r && typeof r.value === "number" && r.value > 0);
  if (rows.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        هنوز تغییری در قیمت ثبت نشده — با «قیمت روز» یا به‌روزرسانی گروهی، تاریخچه ساخته می‌شود.
      </p>
    );
  }
  const W = 320;
  const H = 84;
  const PAD = 8;
  const values = rows.map((r) => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = rows.map((r, i) => {
    const x = PAD + (i * (W - PAD * 2)) / (rows.length - 1);
    const y = PAD + (1 - (r.value - min) / span) * (H - PAD * 2);
    return { x, y, ...r };
  });
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${PAD},${H - 2} ${line} ${W - PAD},${H - 2}`;
  const rose = rows[rows.length - 1].value >= rows[0].value;
  const stroke = rose ? "#d97706" : "#0d9488";
  const fill = rose ? "rgba(217,119,6,.12)" : "rgba(13,148,136,.12)";

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-21 w-full"
        role="img"
        aria-label="نمودار تغییرات قیمت"
        preserveAspectRatio="none"
      >
        <polygon points={area} fill={fill} />
        <polyline
          points={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={stroke} strokeWidth="2">
            <title>{`${p.value.toLocaleString("fa-IR")} تومان — ${faDate(p.at)}`}</title>
          </circle>
        ))}
      </svg>
      <ul className="scrollbar-thin max-h-36 space-y-1 overflow-y-auto text-xs">
        {[...rows]
          .reverse()
          .slice(0, 8)
          .map((r, i, arr) => {
            const prev = arr[i + 1];
            const delta = prev ? r.value - prev.value : 0;
            return (
              <li
                key={`${r.at}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5"
              >
                <span className="font-medium text-muted-foreground">{faDate(r.at)}</span>
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-normal">
                    {PRICE_SRC_FA[r.src] || r.src}
                  </Badge>
                  {prev && delta !== 0 && (
                    <span
                      className={`flex items-center gap-0.5 font-bold ${delta > 0 ? "text-amber-600" : "text-teal-600"}`}
                    >
                      {delta > 0 ? (
                        <TrendingUp className="size-3" aria-hidden />
                      ) : (
                        <TrendingDown className="size-3" aria-hidden />
                      )}
                      {faNum(Math.abs(delta))}
                    </span>
                  )}
                  <span className="font-bold">{faNum(r.value)}</span>
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

/* ─── خروجی CSV همه کارت‌ها (سازگار با اکسل فارسی) ─────────── */

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: "ترتیب پیش‌فرض" },
  { value: "name", label: "مرتب‌سازی بر اساس نام" },
  { value: "price-asc", label: "ارزان‌ترین اول" },
  { value: "price-desc", label: "گران‌ترین اول" },
];

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function buildCardsCsv(cards: CardWithHtml[]): string {
  const header = [
    "نام محصول",
    "نام لاتین",
    "قیمت (تومان)",
    "لینک مرجع",
    "تم قالب",
    "برچسب‌ها",
    "تعداد مشخصات",
    "روش مصرف",
  ];
  const rows = cards.map((c) => [
    c.name || c.rawInput,
    c.nameEn || "",
    c.priceValue || 0,
    c.link || "",
    themeLabel(c.theme),
    (c.tags || []).join("، "),
    c.specs?.length ?? 0,
    (c.usage || "").replace(/\r?\n/g, " | "),
  ]);
  const body = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return `\uFEFF${body}`;
}

/* ─── پیش‌نمایش مقیاس‌شده کارت ─────────────────────────────── */

export function CardPreview({
  html,
  title,
  scale = 0.55,
  className = "h-[420px]",
}: {
  html?: string;
  title: string;
  scale?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative flex justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-900 ${className}`}
    >
      {html ? (
        <iframe
          srcDoc={html}
          title={`پیش‌نمایش کارت ${title}`}
          sandbox=""
          loading="lazy"
          className="pointer-events-none h-[764px] w-[480px] shrink-0 border-0 bg-white"
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          پیش‌نمایش در دسترس نیست
        </div>
      )}
    </div>
  );
}

/* ─── نشان‌های راستی‌آزمایی ────────────────────────────────── */

function VerifyBadges({ card }: { card: CardWithHtml }) {
  if (!card.issues || card.issues.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold">راستی‌آزمایی</h4>
      <div className="flex flex-wrap gap-2">
        {card.issues.map((issue, i) => {
          const tone = issue.ok
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
            : issue.fixed
              ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300"
              : "border-red-300 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300";
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={`cursor-default gap-1.5 rounded-full px-3 py-1.5 ${tone}`}>
                  {issue.item}
                  {issue.ok ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : issue.fixed ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <X className="size-3.5" aria-hidden />
                  )}
                  {issue.fixed && !issue.ok && <span className="text-[10px]">(اصلاح شد)</span>}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-xs" dir="rtl">
                {issue.detail}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

/* ─── دیالوگ مشاهده کامل ──────────────────────────────────── */

function CardDetailDialog({ card, jobId }: { card: CardWithHtml; jobId: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 rounded-xl text-xs transition-colors hover:border-emerald-400 hover:text-emerald-700"
        >
          <Maximize2 className="size-4" aria-hidden />
          مشاهده کامل
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-right leading-7">{card.name || card.rawInput}</DialogTitle>
          <DialogDescription className="text-right">
            جزئیات کامل کارت شامل پیش‌نمایش، مشخصات و نتیجه راستی‌آزمایی
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <CardPreview
            html={card.html}
            title={card.name || card.rawInput}
            scale={0.85}
            className="h-[65vh] rounded-xl border"
          />

          <VerifyBadges card={card} />

          {(card.price || card.priceValue > 0) && (
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold">قیمت نهایی:</h4>
              <Badge className="rounded-full bg-emerald-600 px-3 py-1 text-white">
                {card.price ||
                  `${faNum(card.priceValue)} تومان`}
              </Badge>
            </div>
          )}

          {card.priceHistory && card.priceHistory.length > 0 && (
            <div className="space-y-2 rounded-xl border bg-muted/20 p-3.5">
              <h4 className="flex items-center gap-1.5 text-sm font-bold">
                <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                قیمت‌نگار — تاریخچه تغییرات قیمت
              </h4>
              <PriceSparkline history={card.priceHistory} />
            </div>
          )}

          {card.description && (
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold">توضیحات</h4>
              <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {card.description}
              </p>
            </div>
          )}

          {card.usage && (
            <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/30 dark:bg-amber-950/30">
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">روش مصرف</h4>
              <p className="whitespace-pre-line text-sm leading-7 text-amber-900/80 dark:text-amber-200/80">
                {card.usage}
              </p>
            </div>
          )}

          {card.specs && card.specs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold">مشخصات</h4>
              <ul className="scrollbar-thin max-h-44 space-y-1 overflow-y-auto rounded-xl border p-2 text-sm">
                {card.specs.map((spec, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg px-2.5 py-1.5 odd:bg-muted/50"
                  >
                    <span className="shrink-0 font-medium text-muted-foreground">{spec.key}</span>
                    <span className="text-left leading-6">{spec.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {card.priceSource && card.priceSource.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold">منابع قیمت</h4>
              <ul className="space-y-1.5 text-sm">
                {card.priceSource.map((src, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-1.5 font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      <span className="truncate" dir="ltr">{src.site}</span>
                      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                    </a>
                    <span className="shrink-0 font-bold">
                      {faNum(src.price)} <span className="text-xs font-normal">تومان</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {card.link && (
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold">لینک مرجع</h4>
              <a
                href={card.link}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="block truncate rounded-lg bg-muted/50 px-3 py-2 text-left font-mono text-xs text-emerald-700 hover:underline dark:text-emerald-400"
              >
                {card.link}
              </a>
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button asChild className="h-10 gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
              <a href={`/api/jobs/${jobId}/download/${card.id}`} download>
                <Download className="size-4" aria-hidden />
                دانلود HTML
              </a>
            </Button>
            <Button asChild variant="outline" className="h-10 gap-2 rounded-xl">
              <a href={`/api/jobs/${jobId}/download/${card.id}?format=json`} download>
                <Braces className="size-4" aria-hidden />
                دانلود JSON
              </a>
            </Button>
            <PrintCardButton cardId={card.id} />
            <ShareCardDialog card={card} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── دیالوگ اشتراک‌گذاری کارت (لینک عمومی + QR) ─────────── */

export function ShareCardDialog({
  card,
}: {
  card: CardWithHtml;
  jobId?: string;
  asChildButton?: boolean;
}) {
  const title = card.name || card.rawInput;
  const sharePath = `/api/cards/${card.id}/share`;
  const [shareUrl, setShareUrl] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [embedCopied, setEmbedCopied] = React.useState(false);

  const embedCode = React.useMemo(
    () =>
      `<iframe src="${shareUrl}" width="480" height="720" style="border:0;border-radius:16px;max-width:100%;" loading="lazy" title="Product Card"></iframe>`,
    [shareUrl],
  );

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}${sharePath}`);
    }
  }, [sharePath]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("لینک اشتراک‌گذاری کپی شد");
      window.setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      toast.error("کپی ناموفق بود", { description: toErrorMessage(e) });
    }
  };

  const copyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setEmbedCopied(true);
      toast.success("کد Embed کپی شد");
      window.setTimeout(() => setEmbedCopied(false), 1800);
    } catch (e) {
      toast.error("کپی ناموفق بود", { description: toErrorMessage(e) });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 gap-1.5 rounded-xl text-xs transition-colors hover:border-emerald-400 hover:text-emerald-700">
          <Share2 className="size-4" aria-hidden />
          اشتراک‌گذاری
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-thin sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Share2 className="size-4" aria-hidden />
            </span>
            اشتراک‌گذاری کارت
          </DialogTitle>
          <DialogDescription className="text-right">
            لینک عمومی و QR کد کارت «{title}» — صفحه اشتراک مستقل با سئوی محصول
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR کد */}
          <div className="flex flex-col items-center gap-2.5 rounded-2xl border bg-muted/30 p-4">
            <div className="rounded-xl border-4 border-white bg-white p-1.5 shadow-md ring-1 ring-black/5">
              <img
                src={`/api/cards/${card.id}/qr`}
                alt={`QR کد اشتراک‌گذاری ${title}`}
                width={168}
                height={168}
                className="size-[168px]"
                loading="lazy"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              برای مشاهده سریع کارت روی موبایل، اسکن کنید
            </p>
          </div>

          {/* لینک عمومی */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold">لینک عمومی کارت</label>
            <div className="flex gap-2" dir="ltr">
              <input
                readOnly
                value={shareUrl}
                aria-label="لینک عمومی کارت"
                className="h-10 min-w-0 flex-1 truncate rounded-xl border bg-muted/40 px-3 font-mono text-xs text-muted-foreground"
              />
              <Button
                type="button"
                onClick={() => void copyLink()}
                className="h-10 shrink-0 gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
              >
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied ? "کپی شد" : "کپی"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button asChild className="h-10 gap-1.5 rounded-xl bg-emerald-600 text-xs text-white hover:bg-emerald-700">
              <a href={sharePath} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden />
                باز کردن صفحه
              </a>
            </Button>
            <Button asChild variant="outline" className="h-10 gap-1.5 rounded-xl text-xs">
              <a href={`/api/cards/${card.id}/qr`} download={`qr-${card.id.slice(-6)}.png`}>
                <QrCode className="size-4" aria-hidden />
                دانلود QR
              </a>
            </Button>
          </div>

          {/* کد Embed برای درج در سایت‌های خارجی */}
          <div className="space-y-1.5 rounded-2xl border bg-muted/30 p-3">
            <label className="flex items-center gap-1.5 text-xs font-bold">
              <Code2 className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
              کد Embed برای درج در سایت
            </label>
            <div className="flex gap-2" dir="ltr">
              <input
                readOnly
                value={embedCode}
                aria-label="کد Embed کارت"
                onFocus={(e) => e.currentTarget.select()}
                className="h-10 min-w-0 flex-1 truncate rounded-xl border bg-muted/40 px-3 font-mono text-[11px] text-muted-foreground"
              />
              <Button
                type="button"
                onClick={() => void copyEmbed()}
                className="h-10 shrink-0 gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
              >
                {embedCopied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {embedCopied ? "کپی شد" : "کپی"}
              </Button>
            </div>
            <p className="text-[11px] leading-5 text-muted-foreground">
              این کد را داخل HTML سایت یا فروشگاه خود قرار دهید تا کارت به‌صورت زنده و واکنش‌گرا نمایش داده شود.
            </p>
          </div>

          <p className="text-[11px] leading-5 text-muted-foreground">
            صفحه اشتراک شامل متاتگ‌های سوشال و داده ساختاریافته Product (سئو) است؛ می‌توانید لینک را در بله، واتساپ یا اینستاگرام بفرستید.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── دکمه نسخه انگلیسی کارت (ترجمه + دانلود چپ‌به‌راست) ─────────── */

function EnVersionButton({
  card,
  jobId,
  onCardUpdated,
}: {
  card: CardWithHtml;
  jobId: string;
  onCardUpdated: (c: CardWithHtml) => void;
}) {
  const [building, setBuilding] = React.useState(false);

  const downloadEn = () => {
    const a = document.createElement("a");
    a.href = `/api/jobs/${jobId}/download/${card.id}?lang=en`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const buildEn = async () => {
    setBuilding(true);
    try {
      await apiJson<{ ok: boolean }>(`/api/cards/${card.id}/translate`, {
        method: "POST",
      });
      onCardUpdated({ ...card, hasEn: true });
      toast.success("نسخه انگلیسی ساخته شد؛ دانلود آغاز می‌شود");
      downloadEn();
    } catch (e) {
      toast.error("ساخت نسخه انگلیسی ناموفق بود", {
        description: toErrorMessage(e),
      });
    } finally {
      setBuilding(false);
    }
  };

  if (card.hasEn) {
    return (
      <Button
        asChild
        variant="outline"
        className="h-10 gap-1.5 rounded-xl border-teal-300 text-xs text-teal-800 transition-colors hover:bg-teal-50 hover:text-teal-900 dark:border-teal-500/30 dark:text-teal-300 dark:hover:bg-teal-950/30"
      >
        <a
          href={`/api/jobs/${jobId}/download/${card.id}?lang=en`}
          download
          title="دانلود نسخه انگلیسی چپ‌به‌راست (LTR)"
        >
          <Languages className="size-4" aria-hidden />
          دانلود EN
        </a>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      disabled={building}
      onClick={() => void buildEn()}
      className="h-10 gap-1.5 rounded-xl border-teal-300 text-xs text-teal-800 transition-colors hover:bg-teal-50 hover:text-teal-900 dark:border-teal-500/30 dark:text-teal-300 dark:hover:bg-teal-950/30"
    >
      {building ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Languages className="size-4" aria-hidden />
      )}
      {building ? "در حال ترجمه…" : "نسخه EN"}
    </Button>
  );
}

/* ─── دکمه به‌روزرسانی قیمت کارت (جستجوی تازه + حاشیه سود پروسه) ─────── */

function RepriceButton({
  card,
  onCardUpdated,
}: {
  card: CardWithHtml;
  onCardUpdated: (c: CardWithHtml) => void;
}) {
  const [loading, setLoading] = React.useState(false);

  const reprice = async () => {
    setLoading(true);
    try {
      const data = await apiJson<{
        ok: boolean;
        oldPrice: number;
        newPrice: number;
        sourcesCount: number;
        card: CardWithHtml;
      }>(`/api/cards/${card.id}/reprice`, { method: "POST" });
      const fmt = (n: number) => n.toLocaleString("fa-IR");
      if (data.newPrice !== data.oldPrice && data.oldPrice > 0) {
        toast.success(`قیمت به‌روزرسانی شد: ${fmt(data.oldPrice)} ← ${fmt(data.newPrice)} تومان`, {
          description: `بر اساس ${faNum(data.sourcesCount)} سایت مرجع`,
        });
      } else {
        toast.success(`قیمت تأیید شد: ${fmt(data.newPrice)} تومان`, {
          description: `بر اساس ${faNum(data.sourcesCount)} سایت مرجع`,
        });
      }
      onCardUpdated({ ...card, ...data.card });
    } catch (e) {
      toast.error("به‌روزرسانی قیمت ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      disabled={loading}
      onClick={() => void reprice()}
      title="جستجوی تازه قیمت از سایت‌های مرجع با اعمال حاشیه سود"
      className="h-10 gap-1.5 rounded-xl border-emerald-300 text-xs text-emerald-800 transition-colors hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <RefreshCw className="size-4" aria-hidden />
      )}
      {loading ? "در حال جستجو…" : "قیمت روز"}
    </Button>
  );
}

/* ─── دکمه خروجی PDF / چاپ کارت ───────────────────────── */

function PrintCardButton({ cardId }: { cardId: string }) {
  return (
    <Button
      asChild
      variant="outline"
      className="h-10 gap-1.5 rounded-xl text-xs transition-colors hover:border-emerald-400 hover:text-emerald-700"
    >
      <a
        href={`/api/cards/${cardId}/share?print=1`}
        target="_blank"
        rel="noopener noreferrer"
        title="باز کردن نسخه چاپی A4 — ذخیره به‌عنوان PDF از پنجره چاپ"
      >
        <Printer className="size-4" aria-hidden />
        PDF / چاپ
      </a>
    </Button>
  );
}

/* ─── کارت خروجی ──────────────────────────────────────────── */

interface OutputCardProps {
  card: CardWithHtml;
  jobId: string;
  index: number;
  onEdit: (card: CardWithHtml) => void;
  onCardUpdated: (card: CardWithHtml) => void;
}

function OutputCardItem({ card, jobId, index, onEdit, onCardUpdated }: OutputCardProps) {
  const title = card.name || card.rawInput;

  const copyHtml = async () => {
    if (!card.html) {
      toast.error("محتوای HTML این کارت در دسترس نیست");
      return;
    }
    try {
      await navigator.clipboard.writeText(card.html);
      toast.success("کد HTML کارت کپی شد");
    } catch (e) {
      toast.error("کپی ناموفق بود", { description: toErrorMessage(e) });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.07, 0.4), duration: 0.35, ease: "easeOut" }}
      className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-600/10 hover:ring-1 hover:ring-emerald-500/30 dark:hover:ring-emerald-400/20"
    >
      <CardPreview html={card.html} title={title} />

      <div className="space-y-3 p-4">
        <h3 className="line-clamp-2 min-h-11 text-sm font-bold leading-6">{title}</h3>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1 rounded-full bg-gradient-to-l from-emerald-600 to-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-sm shadow-emerald-600/20">
            <Coins className="size-3.5 opacity-90" aria-hidden />
            {(card.price || (card.priceValue > 0 ? `${faNum(card.priceValue)} تومان` : "")) || "بدون قیمت"}
          </Badge>
          <PriceDeltaBadge history={card.priceHistory || []} />
          <Badge
            variant="outline"
            className="gap-1 rounded-full text-[11px] font-normal text-muted-foreground"
          >
            <span
              className="inline-block size-2 rounded-full"
              style={{
                background:
                  card.theme === "rose"
                    ? "#e11d48"
                    : card.theme === "violet"
                      ? "#7c3aed"
                      : card.theme === "amber"
                        ? "#b45309"
                        : card.theme === "teal"
                          ? "#0d9488"
                          : card.theme === "midnight"
                            ? "#34d399"
                            : "#16a34a",
              }}
              aria-hidden
            />
            تم {themeLabel(card.theme)}
          </Badge>
          {card.nameEn && (
            <Badge variant="outline" className="max-w-40 rounded-full text-[11px] font-normal" dir="ltr">
              <span className="truncate">{card.nameEn}</span>
            </Badge>
          )}
          {card.hasEn && (
            <Badge
              className="gap-1 rounded-full border border-teal-300 bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/15 dark:text-teal-300"
              dir="ltr"
              title="نسخه انگلیسی این کارت ساخته شده است"
            >
              <Languages className="size-3" aria-hidden />
              EN ✓
            </Badge>
          )}
          {(card.tags || []).slice(0, 2).map((t) => {
            const c = tagColor(t);
            return (
              <Badge
                key={t}
                variant="outline"
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.border}`}
                title={`برچسب: ${t}`}
              >
                {t}
              </Badge>
            );
          })}
          {(card.tags || []).length > 2 && (
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground">
              +{faNum((card.tags || []).length - 2)}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-10 gap-1.5 rounded-xl text-xs">
            <a href={`/api/jobs/${jobId}/download/${card.id}`} download>
              <Download className="size-4" aria-hidden />
              دانلود HTML
            </a>
          </Button>
          <CardDetailDialog card={card} jobId={jobId} />
          <Button
            onClick={() => onEdit(card)}
            className="h-10 gap-1.5 rounded-xl bg-amber-500 text-xs text-white hover:bg-amber-600"
          >
            <Wand2 className="size-4" aria-hidden />
            ویرایش هوشمند
          </Button>
          <CardEditorDialog card={card} onSaved={onCardUpdated} />
          <RepriceButton card={card} onCardUpdated={onCardUpdated} />
          <EnVersionButton card={card} jobId={jobId} onCardUpdated={onCardUpdated} />

          {/* گزینه‌های بیشتر — اکشن‌های ثانویه */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="col-span-2 h-10 gap-1.5 rounded-xl border-dashed text-xs text-muted-foreground transition-colors hover:border-emerald-400 hover:text-emerald-700"
              >
                <MoreHorizontal className="size-4" aria-hidden />
                گزینه‌های بیشتر
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56 rounded-xl">
              <DropdownMenuItem
                onSelect={() => void copyHtml()}
                className="gap-2 text-xs"
                aria-label="کپی کد HTML کارت"
              >
                <Copy className="size-4 text-emerald-600" aria-hidden />
                کپی کد HTML
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/api/jobs/${jobId}/download/${card.id}?format=json`}
                  download
                  className="gap-2 text-xs"
                  title="داده ساختاریافته کارت برای مصرف برنامه‌ای"
                >
                  <Braces className="size-4 text-emerald-600" aria-hidden />
                  دانلود JSON
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/api/cards/${card.id}/share?print=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2 text-xs"
                  title="باز کردن نسخه چاپی A4 — ذخیره به‌عنوان PDF از پنجره چاپ"
                >
                  <Printer className="size-4 text-emerald-600" aria-hidden />
                  PDF / چاپ
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  const url = `${window.location.origin}/api/cards/${card.id}/share`;
                  navigator.clipboard
                    .writeText(url)
                    .then(() => toast.success("لینک عمومی کارت کپی شد"))
                    .catch((e) => toast.error("کپی ناموفق بود", { description: toErrorMessage(e) }));
                }}
                className="gap-2 text-xs"
              >
                <Link2 className="size-4 text-emerald-600" aria-hidden />
                کپی لینک عمومی
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/api/cards/${card.id}/share`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2 text-xs"
                >
                  <ExternalLink className="size-4 text-emerald-600" aria-hidden />
                  باز کردن صفحه عمومی
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── اعمال گروهی تم روی همه کارت‌ها ──────────────────── */

function BulkThemePopover({
  jobId,
  disabled,
  onApplied,
}: {
  jobId: string;
  disabled: boolean;
  onApplied: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [applying, setApplying] = React.useState("");

  const applyTheme = async (key: string, label: string) => {
    setApplying(key);
    try {
      const data = await apiJson<{ ok: boolean; updated: number; theme: string }>(
        `/api/jobs/${jobId}/theme`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: key }),
        },
      );
      toast.success(`تم «${label}» روی ${faNum(data.updated ?? 0)} کارت اعمال شد`);
      setOpen(false);
      onApplied();
    } catch (e) {
      toast.error("اعمال گروهی تم ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setApplying("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="h-11 gap-2 rounded-xl border-emerald-300 bg-white/70 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-300"
        >
          <PaintBucket className="size-5" aria-hidden />
          تغییر گروهی تم
        </Button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="center" className="w-72 rounded-xl p-3">
        <p className="mb-2 text-xs font-bold">انتخاب تم برای همه کارت‌های این پروسه</p>
        <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
          HTML همه کارت‌ها بلافاصله با تم جدید بازسازی می‌شود.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CARD_THEME_OPTIONS.map((t) => (
            <button
              key={t.key}
              type="button"
              disabled={applying !== ""}
              onClick={() => void applyTheme(t.key, t.label)}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-right text-xs font-semibold transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-50/60 disabled:opacity-50 dark:hover:bg-emerald-950/30"
            >
              {applying === t.key ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-emerald-600" aria-hidden />
              ) : (
                <span
                  className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ background: t.swatch[0] }}
                  aria-hidden
                />
              )}
              {t.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─── به‌روزرسانی گروهی قیمت همه کارت‌های پروسه ─────────── */

interface BulkRepriceResult {
  cardId: string;
  name: string;
  status: "updated" | "confirmed" | "failed";
  oldPrice: number;
  newPrice: number;
  sourcesCount: number;
  error?: string;
}

function BulkRepriceButton({
  jobId,
  disabled,
  cardCount,
  onApplied,
}: {
  jobId: string;
  disabled: boolean;
  cardCount: number;
  onApplied: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [results, setResults] = React.useState<{
    total: number;
    skipped: number;
    updated: number;
    confirmed: number;
    failed: number;
    results: BulkRepriceResult[];
  } | null>(null);

  const run = async () => {
    setRunning(true);
    setOpen(false);
    try {
      const data = await apiJson<{
        ok: boolean;
        total: number;
        skipped: number;
        updated: number;
        confirmed: number;
        failed: number;
        results: BulkRepriceResult[];
      }>(`/api/jobs/${jobId}/reprice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setResults(data);
      onApplied();
      toast.success("به‌روزرسانی گروهی قیمت تمام شد", {
        description: `${faNum(data.updated)} قیمت تغییر کرد، ${faNum(data.confirmed)} تأیید شد${data.failed ? `، ${faNum(data.failed)} ناموفق` : ""}`,
      });
    } catch (e) {
      toast.error("به‌روزرسانی گروهی قیمت ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setRunning(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("fa-IR");

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled || running}
            title="جستجوی تازه قیمت همه کارت‌های این پروسه از سایت‌های مرجع"
            className="h-11 gap-2 rounded-xl border-emerald-300 bg-white/70 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-300"
          >
            {running ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-5" aria-hidden />
            )}
            {running ? "در حال جستجوی قیمت‌ها…" : "قیمت‌روز گروهی"}
          </Button>
        </PopoverTrigger>
        <PopoverContent dir="rtl" align="center" className="w-72 rounded-xl p-4">
          <p className="mb-1.5 text-xs font-bold">به‌روزرسانی قیمت همه کارت‌ها</p>
          <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
            برای {faNum(cardCount)} کارت آماده، قیمت از سایت‌های مرجع جستجو و با حاشیه سود تنظیمات شما
            بازمحاسبه می‌شود (هر کارت چند ثانیه).
          </p>
          <Button
            onClick={() => void run()}
            className="h-10 w-full gap-2 rounded-xl bg-emerald-600 text-xs text-white hover:bg-emerald-700"
          >
            <RefreshCw className="size-4" aria-hidden />
            شروع جستجوی گروهی
          </Button>
        </PopoverContent>
      </Popover>

      {/* دیالوگ نتیجه */}
      <Dialog open={!!results} onOpenChange={(o) => !o && setResults(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <RefreshCw className="size-4" aria-hidden />
              </span>
              نتیجه به‌روزرسانی گروهی قیمت
            </DialogTitle>
            <DialogDescription className="text-right">
              {results &&
                `${faNum(results.updated)} تغییر کرد، ${faNum(results.confirmed)} تأیید شد، ${faNum(results.failed)} ناموفق${results.skipped ? ` — ${faNum(results.skipped)} کارت از سقف پردازش صرف‌نظر شد` : ""}`}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {results?.results.map((r) => (
              <li key={r.cardId} className="rounded-xl border p-3 text-xs">
                <div className="mb-1.5 line-clamp-1 font-bold">{r.name}</div>
                {r.status === "failed" ? (
                  <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                    <X className="size-3.5" aria-hidden />
                    {r.error || "ناموفق"}
                  </span>
                ) : r.status === "confirmed" ? (
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <Check className="size-3.5" aria-hidden />
                    قیمت تأیید شد: {fmt(r.newPrice)} تومان — {faNum(r.sourcesCount)} مرجع
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                    <TrendingUp className="size-3.5" aria-hidden />
                    {fmt(r.oldPrice)} ← {fmt(r.newPrice)} تومان
                    <span className="font-normal text-muted-foreground">
                      ({faNum(r.sourcesCount)} مرجع)
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── دکمه کاتالوگ PDF پروسه ─────────────────── */

function CatalogButton({ jobId, disabled }: { jobId: string; disabled: boolean }) {
  return (
    <Button
      asChild
      variant="outline"
      disabled={disabled}
      title="کاتالوگ چاپی A4 همه کارت‌های این پروسه با جلد و فهرست — ذخیره PDF از پنجره چاپ"
      className="h-11 gap-2 rounded-xl border-emerald-300 bg-white/70 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-300"
    >
      <a href={`/api/jobs/${jobId}/catalog?print=1`} target="_blank" rel="noopener noreferrer">
        <BookText className="size-5" aria-hidden />
        کاتالوگ PDF
      </a>
    </Button>
  );
}

/* ─── گالری خروجی ─────────────────────────────────────────── */

export interface OutputGalleryProps {
  jobId: string;
  cards: CardWithHtml[];
  running: boolean;
  onEditCard: (card: CardWithHtml) => void;
  onCardUpdated: (card: CardWithHtml) => void;
  onBulkThemeApplied: () => void;
}

export function OutputGallery({
  jobId,
  cards,
  running,
  onEditCard,
  onCardUpdated,
  onBulkThemeApplied,
}: OutputGalleryProps) {
  const [query, setQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState("default");

  const visibleCards = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = cards;
    if (q) {
      list = list.filter((c) =>
        `${c.name || ""} ${c.nameEn || ""} ${c.rawInput}`
          .toLowerCase()
          .includes(q),
      );
    }
    if (sortBy === "name") {
      list = [...list].sort((a, b) =>
        (a.name || a.rawInput).localeCompare(b.name || b.rawInput, "fa"),
      );
    } else if (sortBy === "price-asc") {
      list = [...list].sort((a, b) => (a.priceValue || 0) - (b.priceValue || 0));
    } else if (sortBy === "price-desc") {
      list = [...list].sort((a, b) => (b.priceValue || 0) - (a.priceValue || 0));
    }
    return list;
  }, [cards, query, sortBy]);

  const exportCsv = () => {
    if (!visibleCards.length) {
      toast.error("کارتی برای خروجی CSV وجود ندارد");
      return;
    }
    try {
      const csv = buildCardsCsv(visibleCards);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cards-${jobId.slice(-6)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`فایل CSV با ${faNum(visibleCards.length)} کارت دانلود شد`);
    } catch (e) {
      toast.error("ساخت فایل CSV ناموفق بود", { description: toErrorMessage(e) });
    }
  };

  if (!running && cards.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <motion.section
        id="outputs"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="scroll-mt-24 space-y-5"
      >
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-emerald-300 bg-gradient-to-bl from-emerald-50/80 via-white to-amber-50/60 p-5 text-center shadow-sm dark:border-emerald-500/30 dark:from-emerald-950/25 dark:via-card dark:to-amber-950/10">
          <div
            className="pointer-events-none absolute -left-10 -top-10 size-32 rounded-full bg-emerald-200/40 blur-2xl dark:bg-emerald-500/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-12 -right-8 size-32 rounded-full bg-amber-200/40 blur-2xl dark:bg-amber-500/10"
            aria-hidden
          />
          <h2 className="relative text-lg font-extrabold">
            خروجی‌ها
            <Badge className="mr-2 rounded-full bg-emerald-600 px-2.5 py-0.5 text-white">
              {faNum(cards.length)} کارت
            </Badge>
          </h2>
          <p className="relative text-xs text-muted-foreground">
            پیش‌نمایش زنده کارت‌های تولیدشده — دانلود HTML، JSON، اکسل، کاتالوگ PDF یا ZIP کامل (شامل HTML + JSON + cards.json)
          </p>
          {cards.length > 0 && (
            <div className="relative flex flex-wrap items-center justify-center gap-2.5">
              <Button
                asChild
                size="lg"
                className="h-11 gap-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
              >
                <a href={`/api/jobs/${jobId}/download`} download>
                  <FileArchive className="size-5" aria-hidden />
                  دانلود ZIP همه کارت‌ها
                </a>
              </Button>
              <BulkThemePopover jobId={jobId} disabled={running} onApplied={onBulkThemeApplied} />
              <BulkRepriceButton
                jobId={jobId}
                disabled={running}
                cardCount={cards.filter((c) => c.status === "done" && c.html).length}
                onApplied={onBulkThemeApplied}
              />
              <CatalogButton jobId={jobId} disabled={running} />
              <Button
                asChild
                variant="outline"
                title="فایل اکسل استایل‌دار (شیت راست‌به‌چپ + خلاصه آماری)"
                className="h-11 gap-2 rounded-xl border-emerald-300 bg-white/70 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-300"
              >
                <a href={`/api/jobs/${jobId}/excel`} download>
                  <FileSpreadsheet className="size-5 text-emerald-600" aria-hidden />
                  خروجی اکسل
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => void exportCsv()}
                disabled={running}
                title="جدول قیمت و مشخصات همه کارت‌ها برای اکسل"
                className="h-11 gap-2 rounded-xl border-emerald-300 bg-white/70 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-300"
              >
                <FileSpreadsheet className="size-5" aria-hidden />
                خروجی CSV
              </Button>
            </div>
          )}
          {cards.length > 2 && (
            <div className="relative flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute inset-y-0 right-3 flex w-4 items-center text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجو در کارت‌ها (نام فارسی یا لاتین)…"
                  className="h-10 rounded-xl pr-9"
                  aria-label="جستجو در کارت‌های خروجی"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="پاک کردن جستجو"
                    className="absolute inset-y-0 left-2 flex w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              <Select dir="rtl" value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-full rounded-xl sm:w-52" aria-label="مرتب‌سازی کارت‌ها">
                  <span className="flex items-center gap-1.5 text-xs">
                    <ArrowDownWideNarrow className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {cards.length === 0 && running ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border bg-card">
                <Skeleton className="h-[420px] w-full rounded-none" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visibleCards.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed p-10 text-center">
            <Search className="size-10 text-emerald-400/70" aria-hidden />
            <p className="text-sm font-medium">کارتی با عبارت «{query}» یافت نشد</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setSortBy("default");
              }}
              className="h-9 rounded-lg text-xs text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              پاک کردن جستجو و مرتب‌سازی
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleCards.map((card, i) => (
              <OutputCardItem
                key={card.id}
                card={card}
                jobId={jobId}
                index={i}
                onEdit={onEditCard}
                onCardUpdated={onCardUpdated}
              />
            ))}
          </div>
        )}
      </motion.section>
    </TooltipProvider>
  );
}
