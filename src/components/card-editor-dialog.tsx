"use client";

import * as React from "react";
import { Check, Loader2, Palette, Plus, Save, Trash2, ImagePlus, PencilLine, RefreshCw, Tags, X } from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  apiJson,
  toErrorMessage,
  CARD_THEME_OPTIONS,
  themeLabel,
  tagColor,
  type CardWithHtml,
} from "@/components/shared";
import type { SpecItem } from "@/lib/types";

interface CardEditorDialogProps {
  card: CardWithHtml;
  onSaved?: (card: CardWithHtml) => void;
}

/** دیالوگ ویرایش دستی کارت — ویرایش مستقیم نام/قیمت/توضیح/مصرف/مشخصات */
export function CardEditorDialog({ card, onSaved }: CardEditorDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [refreshingImage, setRefreshingImage] = React.useState(false);
  const [fetchingPrice, setFetchingPrice] = React.useState(false);
  const [priceNote, setPriceNote] = React.useState("");

  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [usage, setUsage] = React.useState("");
  const [specs, setSpecs] = React.useState<SpecItem[]>([]);
  const [theme, setTheme] = React.useState<string>(card.theme || "emerald");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");

  // همگام‌سازی فرم با کارت هنگام باز شدن یا تغییر کارت
  React.useEffect(() => {
    if (open) {
      setName(card.name || card.rawInput || "");
      setPrice(card.priceValue > 0 ? String(card.priceValue) : "");
      setDescription(card.description || "");
      setUsage(card.usage || "");
      setSpecs(card.specs?.length ? card.specs.map((s) => ({ ...s })) : []);
      setTheme(card.theme || "emerald");
      setTags(Array.isArray(card.tags) ? card.tags.map((t) => t).filter(Boolean) : []);
      setTagInput("");
    }
  }, [open, card]);

  // پاک‌کردن یادداشت قیمت فقط هنگام باز شدن دیالوگ (نه با هر به‌روزرسانی کارت)
  React.useEffect(() => {
    if (open) setPriceNote("");
  }, [open]);

  const updateSpec = (i: number, field: keyof SpecItem, value: string) => {
    setSpecs((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };

  const addTag = () => {
    const v = tagInput.trim().slice(0, 24);
    if (!v) return;
    setTags((prev) => {
      if (prev.includes(v)) return prev;
      if (prev.length >= 8) {
        toast.error("حداکثر ۸ برچسب می‌توانید اضافه کنید");
        return prev;
      }
      return [...prev, v];
    });
    setTagInput("");
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = await apiJson<{ ok: boolean; card: CardWithHtml }>(`/api/cards/${card.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          usage,
          price: price.trim() === "" ? "" : Number(toEnDigits(price)) || price,
          specs: specs.filter((s) => s.key.trim() && s.value.trim()),
          theme,
          tags,
        }),
      });
      toast.success(`کارت ذخیره و با تم «${themeLabel(theme)}» بازسازی شد`);
      onSaved?.(data.card);
      setOpen(false);
    } catch (e) {
      toast.error("ذخیره کارت ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const refreshImage = async () => {
    setRefreshingImage(true);
    try {
      const data = await apiJson<{ ok: boolean; card: CardWithHtml }>(
        `/api/cards/${card.id}/image`,
        { method: "POST" },
      );
      toast.success("تصویر تازه با واترمارک جایگزین شد");
      onSaved?.(data.card);
    } catch (e) {
      toast.error("تازه‌سازی تصویر ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setRefreshingImage(false);
    }
  };

  /** جستجوی تازه قیمت — بلافاصله روی کارت اعمال و HTML بازرندر می‌شود */
  const fetchFreshPrice = async () => {
    setFetchingPrice(true);
    setPriceNote("");
    try {
      const data = await apiJson<{
        ok: boolean;
        oldPrice: number;
        newPrice: number;
        sourcesCount: number;
        card: CardWithHtml;
      }>(`/api/cards/${card.id}/reprice`, { method: "POST" });
      setPrice(String(data.newPrice));
      const fmt = (n: number) => n.toLocaleString("fa-IR");
      setPriceNote(
        `قیمت از ${fmt(data.sourcesCount)} سایت مرجع به‌روزرسانی شد: ${fmt(data.oldPrice)} ← ${fmt(data.newPrice)} تومان`,
      );
      toast.success("قیمت تازه اعمال و HTML بازسازی شد");
      onSaved?.({ ...card, ...data.card });
    } catch (e) {
      toast.error("دریافت قیمت تازه ناموفق بود", { description: toErrorMessage(e) });
    } finally {
      setFetchingPrice(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-1.5 rounded-xl text-xs transition-colors hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-400"
        >
          <PencilLine className="size-4" aria-hidden />
          ویرایش دستی
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-right leading-7">ویرایش دستی کارت</DialogTitle>
          <DialogDescription className="text-right">
            تغییرات بلافاصله روی HTML خروجی اعمال و دوباره رندر می‌شود
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="scrollbar-thin max-h-[60vh] pr-3">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ce-name" className="text-xs font-bold">
                نام محصول (عنوان کارت)
              </Label>
              <Input
                id="ce-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-xl"
                placeholder="مثال: ریمل ایزادورا | Isadora Mascara"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="ce-price" className="text-xs font-bold">
                  قیمت (تومان)
                </Label>
                <button
                  type="button"
                  onClick={() => void fetchFreshPrice()}
                  disabled={fetchingPrice}
                  title="جستجوی تازه قیمت از سایت‌های مرجع"
                  className="flex h-7 items-center gap-1 rounded-full border border-emerald-300 px-2.5 text-[10px] font-bold text-emerald-800 transition-colors hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  {fetchingPrice ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="size-3" aria-hidden />
                  )}
                  قیمت خودکار
                </button>
              </div>
              <Input
                id="ce-price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="numeric"
                className="h-10 rounded-xl text-left"
                dir="ltr"
                placeholder="290000"
              />
              {priceNote ? (
                <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] leading-5 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {priceNote}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  خالی بگذارید تا کارت بدون قیمت نمایش داده شود
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ce-desc" className="text-xs font-bold">
                توضیحات محصول
              </Label>
              <Textarea
                id="ce-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none rounded-xl text-sm leading-7"
                placeholder="توضیح جذاب و روان فارسی…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ce-usage" className="text-xs font-bold">
                روش مصرف
              </Label>
              <Textarea
                id="ce-usage"
                value={usage}
                onChange={(e) => setUsage(e.target.value)}
                rows={2}
                className="resize-none rounded-xl text-sm leading-7"
                placeholder="گام‌به‌گام مصرف محصول…"
              />
            </div>

            <Separator />

            {/* ── انتخاب تم رنگی کارت ── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-bold">
                <Palette className="size-3.5 text-violet-600" aria-hidden />
                تم رنگی قالب (اختصاصی همین کارت)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {CARD_THEME_OPTIONS.map((t) => {
                  const active = theme === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTheme(t.key)}
                      aria-pressed={active}
                      className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-all ${
                        active
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-border bg-card text-muted-foreground hover:border-emerald-300 hover:text-foreground"
                      }`}
                    >
                      <span
                        className="inline-block size-2.5 rounded-full ring-1 ring-black/10"
                        style={{ background: t.swatch[0] }}
                        aria-hidden
                      />
                      {t.label}
                      {active && <Check className="size-3" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* ── برچسب‌های دسته‌بندی ── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-bold">
                <Tags className="size-3.5 text-amber-600" aria-hidden />
                برچسب‌ها (دسته‌بندی در کتابخانه)
                <span className="font-normal text-muted-foreground">— حداکثر ۸</span>
              </Label>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => {
                    const c = tagColor(t);
                    return (
                      <span
                        key={t}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${c.bg} ${c.border}`}
                      >
                        {t}
                        <button
                          type="button"
                          aria-label={`حذف برچسب ${t}`}
                          onClick={() => setTags((p) => p.filter((x) => x !== t))}
                          className="rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="برچسب تازه بنویسید و Enter بزنید…"
                  className="h-10 rounded-xl"
                  aria-label="افزودن برچسب"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addTag}
                  disabled={!tagInput.trim() || tags.length >= 8}
                  className="size-10 shrink-0 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-950/30"
                  aria-label="افزودن برچسب"
                >
                  <Plus className="size-4" aria-hidden />
                </Button>
              </div>
              <p className="text-[11px] leading-5 text-muted-foreground">
                برچسب‌ها در کتابخانه کارت‌ها قابل فیلتر شدن هستند و در خروجی اکسل هم می‌آیند.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">جدول مشخصات</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSpecs((p) => [...p, { key: "", value: "" }])}
                  className="h-8 gap-1 rounded-lg text-xs"
                >
                  <Plus className="size-3.5" aria-hidden />
                  افزودن ردیف
                </Button>
              </div>
              <div className="scrollbar-thin max-h-56 space-y-2 overflow-y-auto pl-1">
                {specs.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={s.key}
                      onChange={(e) => updateSpec(i, "key", e.target.value)}
                      placeholder="ویژگی (مثال: برند)"
                      className="h-9 rounded-lg text-xs"
                    />
                    <Input
                      value={s.value}
                      onChange={(e) => updateSpec(i, "value", e.target.value)}
                      placeholder="مقدار (مثال: ایزادورا)"
                      className="h-9 flex-1 rounded-lg text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`حذف ردیف ${i + 1}`}
                      onClick={() => setSpecs((p) => p.filter((_, idx) => idx !== i))}
                      className="size-9 shrink-0 rounded-lg text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
                {specs.length === 0 && (
                  <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
                    ردیفی وجود ندارد — با دکمه «افزودن ردیف» مشخصات بسازید
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => void save()}
            disabled={saving}
            className="h-11 flex-1 gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            ذخیره و بازسازی HTML
          </Button>
          <Button
            variant="outline"
            onClick={() => void refreshImage()}
            disabled={refreshingImage}
            className="h-11 gap-2 rounded-xl"
          >
            {refreshingImage ? (
              <Loader2 className="size-4 animate-spin text-emerald-600" aria-hidden />
            ) : (
              <ImagePlus className="size-4 text-emerald-600" aria-hidden />
            )}
            تصویر تازه
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** تبدیل ارقام فارسی/عربی به انگلیسی برای قیمت */
function toEnDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
