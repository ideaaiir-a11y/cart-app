"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, MessageCircle, SendHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  apiJson,
  LS_SESSION_KEY,
  toErrorMessage,
  type CardWithHtml,
} from "@/components/shared";

const QUICK_SUGGESTIONS = [
  "توضیحات را کوتاه‌تر کن",
  "قیمت را رقابتی‌تر کن",
  "متنی جذاب‌تر بنویس",
  "مشخصات را کامل‌تر کن",
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  applied?: boolean;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface ChatWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCard: CardWithHtml | null;
  onClearCard: () => void;
  /** فراخوانی هنگام اعمال تغییر دستیار روی کارت (برای نوسازی خروجی‌ها) */
  onCardApplied: () => void;
}

export function ChatWidget({
  open,
  onOpenChange,
  selectedCard,
  onClearCard,
  onCardApplied,
}: ChatWidgetProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "greeting",
      role: "assistant",
      text: "سلام! من دستیار ویرایشگر هستم. می‌توانم توضیحات، قیمت، مشخصات یا متن کارت شما را ویرایش کنم. یکی از کارت‌ها را با دکمه «ویرایش هوشمند» انتخاب کنید یا همین‌جا سؤال بپرسید.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const sessionIdRef = React.useRef("");
  const listRef = React.useRef<HTMLDivElement>(null);

  // ساخت/بازیابی شناسه نشست
  React.useEffect(() => {
    let sid = window.localStorage.getItem(LS_SESSION_KEY);
    if (!sid) {
      sid = newId();
      window.localStorage.setItem(LS_SESSION_KEY, sid);
    }
    sessionIdRef.current = sid;
  }, []);

  // اسکرول خودکار به آخرین پیام
  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, open]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { id: newId(), role: "user", text }]);
    setSending(true);
    try {
      const data = await apiJson<{
        ok: boolean;
        reply: string;
        applied: boolean;
      }>("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          cardId: selectedCard?.id ?? "",
          message: text,
        }),
      });
      setMessages((m) => [
        ...m,
        {
          id: newId(),
          role: "assistant",
          text: data.reply || "پاسخی دریافت نشد.",
          applied: data.applied,
        },
      ]);
    } catch (e) {
      toast.error("ارتباط با دستیار ناموفق بود", {
        description: toErrorMessage(e),
      });
      setMessages((m) => [
        ...m,
        {
          id: newId(),
          role: "assistant",
          text: "متأسفانه ارتباط با دستیار برقرار نشد. لطفاً دوباره تلاش کنید.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* دکمه شناور */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="fixed bottom-4 left-4 z-50"
      >
        <Button
          onClick={() => onOpenChange(!open)}
          aria-label={open ? "بستن دستیار ویرایشگر" : "باز کردن دستیار ویرایشگر"}
          className="size-14 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 transition-all hover:scale-105 hover:bg-emerald-700"
        >
          {open ? (
            <X className="size-6" aria-hidden />
          ) : (
            <MessageCircle className="size-6" aria-hidden />
          )}
        </Button>
      </motion.div>

      {/* پنل چت */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ transformOrigin: "bottom left" }}
            className="fixed bottom-20 left-4 z-50 flex h-[520px] max-h-[calc(100dvh-7rem)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
            role="dialog"
            aria-label="دستیار ویرایشگر"
          >
            {/* سربرگ */}
            <div className="flex items-center gap-2.5 bg-emerald-600 p-3 text-white">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Bot className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-sm font-bold">دستیار ویرایشگر</p>
                {selectedCard ? (
                  <p className="truncate text-[11px] opacity-90">
                    روی کارت: {selectedCard.name || selectedCard.rawInput}
                  </p>
                ) : (
                  <p className="text-[11px] opacity-90">بدون کارت انتخابی — حالت عمومی</p>
                )}
              </div>
              {selectedCard && (
                <button
                  type="button"
                  onClick={onClearCard}
                  aria-label="لغو انتخاب کارت"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="بستن پنل گفتگو"
                className="flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {/* پیام‌ها */}
            <div
              ref={listRef}
              className="scrollbar-thin flex-1 space-y-3 overflow-y-auto bg-muted/40 p-3"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] space-y-1.5 rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm ${
                      m.role === "user"
                        ? "rounded-br-sm bg-emerald-600 text-white"
                        : "rounded-bl-sm border bg-card"
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>
                    {m.applied && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="rounded-full border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-[11px] text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                          روی کارت اعمال شد ✓
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full px-3 text-[11px]"
                          onClick={onCardApplied}
                        >
                          به‌روزرسانی خروجی‌ها
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border bg-card px-3.5 py-2.5 shadow-sm">
                    <Loader2 className="size-3.5 animate-spin text-emerald-600" aria-hidden />
                    <span className="text-xs text-muted-foreground">
                      دستیار در حال نوشتن…
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* پیشنهادهای سریع */}
            <div className="scrollbar-thin flex gap-1.5 overflow-x-auto border-t bg-card px-3 py-2">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={sending}
                  onClick={() => void send(s)}
                  className="shrink-0 rounded-full border bg-muted/60 px-3 py-1.5 text-[11px] text-muted-foreground transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* ورودی پیام */}
            <div className="flex items-center gap-2 border-t bg-card p-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={selectedCard ? "پیام خود را بنویسید…" : "یک کارت انتخاب کنید یا بپرسید…"}
                aria-label="متن پیام به دستیار"
                className="h-11 flex-1 rounded-xl"
              />
              <Button
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                aria-label="ارسال پیام"
                className="size-11 shrink-0 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {sending ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                ) : (
                  <SendHorizontal className="size-5" aria-hidden />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
