// ابزارهای فارسی‌سازی ارقام و قالب‌بندی قیمت

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function toEnDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function formatToman(value: number): string {
  if (!value || value <= 0) return '';
  const grouped = value
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${toFaDigits(grouped)} تومان`;
}

/** استخراج عدد قیمت (تومان) از یک متن فارسی/انگلیسی */
export function extractPriceCandidates(text: string): number[] {
  const normalized = toEnDigits(text);
  const out: number[] = [];
  // الگوهای رایج: ۲۹۰,۰۰۰ تومان | 290000 T | قیمت: ۲۹۰٬۰۰۰
  const re = /(\d{1,3}(?:[,.،٬]\d{3})+|\d{4,9})\s*(?:تومان|تومن|tomans?|toman|IRT|ریال)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    let num = m[1].replace(/[,.،٬]/g, '');
    let val = parseInt(num, 10);
    if (!isFinite(val)) continue;
    // اگر واحد ریال بود → تبدیل به تومان
    const after = normalized.slice(m.index + m[0].length, m.index + m[0].length + 10);
    if (/ریال/.test(m[0] + after) && !/تومان/.test(m[0])) val = Math.round(val / 10);
    // فیلتر مقادیر غیرمعقول برای محصولات مصرفی (۵ هزار تا ۵۰۰ میلیون تومان)
    if (val >= 5000 && val <= 500_000_000) out.push(val);
  }
  return out;
}

/** میانه به‌عنوان قیمت منصفانه */
export function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function slugifyFilename(name: string, fallback = 'product'): string {
  const clean = name
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return clean || fallback;
}

/* ─── پاک‌ساز متن فارسی/لاتین ───────────────────────────────────
   مدل‌های زبانی گاهی حروف چینی/ژاپنی/کره‌ای یا نمادهای بی‌ربط را
   داخل متن فارسی جاسازی می‌کنند (مثال واقعی: «فعالیت‌های户外»).
   این پاک‌ساز نویسه‌های خارج از فارسی/لاتین/عربی را حذف می‌کند. */

// چینی، ژاپنی (کانا/هم)، کره‌ای، علائم CJK و خط‌های بی‌ربط دیگر
const NOISE_SCRIPT = /[\u2E80-\u2EFF\u3000-\u303F\u3040-\u30FF\u3105-\u312F\u3130-\u318F\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uA960-\uA97F\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u0590-\u05FF\u0900-\u097F\u0E00-\u0E7F\u10A0-\u10FF\u3040\u30A0]/g;

/** حذف نویسه‌های چینی/کره‌ای/ژاپنی و خط‌های بی‌ربط از متن فارسی + تمیزکاری فاصله‌ها */
export function sanitizeFaText(input: string): string {
  if (!input) return '';
  let out = input.replace(NOISE_SCRIPT, ' ');
  // بقا‌یای نشانه‌گذاری چسبیده به حذفی‌ها: «،،» یا «، .» یا «..»
  out = out
    .replace(/\s+([،؛,.:!؟?])/g, '$1 ')
    .replace(/([،؛,])(?=\S)/g, '$1 ')
    .replace(/\.{2,}/g, '…')
    .replace(/،\s*…/g, '…')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([))»”])/g, '$1')
    .replace(/([((«“])\s+/g, '$1');
  return out.trim();
}

/** نسخه آرایه‌ای پاک‌ساز برای جدول مشخصات */
export function sanitizeSpecs<T extends { key: string; value: string }>(specs: T[]): T[] {
  return specs.map((s) => ({ ...s, key: sanitizeFaText(s.key), value: sanitizeFaText(s.value) }));
}
