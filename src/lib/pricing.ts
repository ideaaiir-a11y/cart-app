// ─────────────────────────────────────────────────────────────
// قیمت‌گذاری: حاشیه سود + رُند کردن قیمت نهایی (تومان)
// این ماژول بین پایپ‌لاین، به‌روزرسانی قیمت و پیش‌نمایش تنظیمات مشترک است
// ─────────────────────────────────────────────────────────────

/** گزینه‌های مجاز رُند کردن قیمت */
export const PRICE_ROUND_OPTIONS = [0, 1000, 5000, 10000] as const;

/** اعتبارسنجی درصد حاشیه سود (۰ تا ۹۰) */
export function sanitizeMarkup(v: unknown): number {
  const n = Math.round(Number(v));
  if (!isFinite(n) || n <= 0) return 0;
  return Math.min(90, n);
}

/** اعتبارسنجی گام رُند (یکی از مقادیر مجاز) */
export function sanitizeRound(v: unknown): number {
  const n = Math.round(Number(v));
  return (PRICE_ROUND_OPTIONS as readonly number[]).includes(n) ? n : 1000;
}

export interface PricedValue {
  value: number;
  /** قیمت پایه پیش از اعمال حاشیه سود (برای نمایش «از X به Y») */
  base: number;
  markup: number;
  round: number;
}

/**
 * اعمال حاشیه سود و رُند کردن روی قیمت پایه (تومان).
 * مثال: applyJobPrice(290_000, 10, 1000) → 319_000
 */
export function applyJobPrice(
  baseValue: number,
  markupPercent: number,
  roundStep: number,
): PricedValue {
  const base = Math.max(0, Math.round(baseValue));
  const markup = sanitizeMarkup(markupPercent);
  const round = sanitizeRound(roundStep);
  if (base <= 0) return { value: 0, base: 0, markup, round };

  let value = base;
  if (markup > 0) value = Math.round(value * (1 + markup / 100));
  if (round > 0) value = Math.round(value / round) * round;
  // کف منطقی قیمت نهایی
  if (value > 0 && value < 1000) value = 1000;
  return { value, base, markup, round };
}

/** برچسب فارسی گام رُند برای نمایش در UI و لاگ */
export function roundLabel(step: number): string {
  if (!step || step <= 0) return 'بدون رُند';
  const fa = (n: number) => n.toLocaleString('fa-IR');
  return `رُند ${fa(step)}`;
}
