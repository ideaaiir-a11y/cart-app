"use client";

import * as React from "react";
import {
  ImagePlus,
  Inbox,
  Link2,
  Plus,
  UploadCloud,
  X,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  faFileSize,
  faNum,
  fileIcon,
} from "@/components/shared";

const ACCEPTED_TYPES = ".html,.htm,.zip,.png,.jpg,.jpeg,.webp,.txt";

export interface InputSectionProps {
  text: string;
  onTextChange: (v: string) => void;
  files: File[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  imageUrls: string[];
  onImageUrlsChange: (urls: string[]) => void;
  disabled?: boolean;
}

export function InputSection({
  text,
  onTextChange,
  files,
  onFilesAdd,
  onFileRemove,
  imageUrls,
  onImageUrlsChange,
  disabled,
}: InputSectionProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const [urlDraft, setUrlDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const itemCount = React.useMemo(
    () =>
      text.split("\n").filter((l) => l.trim().length > 0).length +
      files.length +
      imageUrls.length,
    [text, files, imageUrls],
  );

  const openPicker = () => inputRef.current?.click();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) onFilesAdd(dropped);
  };

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      return;
    }
    if (imageUrls.includes(url)) {
      setUrlDraft("");
      return;
    }
    onImageUrlsChange([...imageUrls, url]);
    setUrlDraft("");
  };

  return (
    <Card className={disabled ? "pointer-events-none opacity-60" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <Inbox className="size-5" aria-hidden />
          </span>
          ورودی محصولات
          {itemCount > 0 && (
            <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400">
              {faNum(itemCount)} مورد
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          هر خط یک محصول: نام فارسی، نام لاتین یا لینک صفحه محصول
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* متن محصولات */}
        <div className="space-y-2">
          <Label htmlFor="product-input" className="text-sm font-semibold">
            نام محصول یا لینک
          </Label>
          <Textarea
            id="product-input"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={
              "ریمل بیگ بولد اکستریم ایزادورا\nکرم ضدآفتاب SPF50 درماتیکا\nhttps://example.com/product/12345"
            }
            className="min-h-[150px] resize-y rounded-xl leading-7"
            aria-label="نام محصول یا لینک، هر خط یک محصول"
          />
        </div>

        {/* آپلود فایل با درگ‌وان‌دراپ */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            فایل‌های محصول (اختیاری)
          </Label>
          <div
            role="button"
            tabIndex={0}
            aria-label="انتخاب یا رها کردن فایل"
            onClick={openPicker}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openPicker();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-all ${
              dragOver
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                : "border-border bg-muted/40 hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20"
            }`}
          >
            <UploadCloud
              className={`size-8 ${dragOver ? "text-emerald-600" : "text-muted-foreground"}`}
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">
              فایل‌ها را اینجا بکشید و رها کنید یا
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                openPicker();
              }}
            >
              انتخاب فایل
            </Button>
            <p className="text-[11px] text-muted-foreground">
              HTML، ZIP، تصویر (PNG/JPG/WebP) یا متن TXT
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              className="hidden"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                if (picked.length > 0) onFilesAdd(picked);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {files.map((file, i) => {
                const Icon = fileIcon(file.name);
                return (
                  <Badge
                    key={`${file.name}-${i}`}
                    variant="outline"
                    className="h-9 max-w-full gap-1.5 rounded-lg py-1 pl-1.5 pr-2.5 text-xs font-normal"
                  >
                    <Icon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <span className="max-w-44 truncate" dir="ltr">
                      {file.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {faFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onFileRemove(i)}
                      aria-label={`حذف فایل ${file.name}`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* لینک مستقیم تصاویر */}
        <div className="space-y-2">
          <Label
            htmlFor="image-url-input"
            className="flex items-center gap-1.5 text-sm font-semibold"
          >
            <ImagePlus className="size-4 text-amber-500" aria-hidden />
            لینک مستقیم تصاویر (اختیاری)
          </Label>
          <div className="flex gap-2">
            <Input
              id="image-url-input"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrl();
                }
              }}
              placeholder="https://example.com/image.jpg"
              className="h-11 flex-1 rounded-xl"
              dir="ltr"
            />
            <Button
              type="button"
              onClick={addUrl}
              disabled={!/^https?:\/\//i.test(urlDraft.trim())}
              aria-label="افزودن لینک تصویر"
              className="h-11 gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Plus className="size-4" aria-hidden />
              افزودن
            </Button>
          </div>
          {urlDraft.trim().length > 0 && !/^https?:\/\//i.test(urlDraft.trim()) && (
            <p className="text-xs text-red-500">
              لینک باید با http:// یا https:// شروع شود
            </p>
          )}
          {imageUrls.length > 0 && (
            <ul className="scrollbar-thin max-h-32 space-y-1.5 overflow-y-auto rounded-xl border bg-muted/40 p-2">
              {imageUrls.map((url, i) => (
                <li
                  key={url}
                  className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5 text-xs shadow-sm"
                >
                  <Link2 className="size-3.5 shrink-0 text-amber-500" aria-hidden />
                  <span className="flex-1 truncate" dir="ltr" title={url}>
                    {url}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onImageUrlsChange(imageUrls.filter((_, j) => j !== i))
                    }
                    aria-label={`حذف لینک ${url}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
