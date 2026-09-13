// ─────────────────────────────────────────────────────────────
// قرارداد مشترک فرانت/بک — کارتابل هوشمند محصول
// ─────────────────────────────────────────────────────────────

export type StageKey =
  | 'naming'
  | 'pricing'
  | 'images'
  | 'verify'
  | 'optimize'
  | 'build';

export interface StageInfo {
  key: StageKey;
  title: string; // عنوان فارسی
  status: 'pending' | 'running' | 'done' | 'error';
  logs: string[];
  startedAt?: string;
  endedAt?: string;
}

export interface PriceSource {
  site: string;
  price: number;
  url: string;
}

export interface SpecItem {
  key: string;
  value: string;
}

export interface VerifyIssue {
  item: string; // نام | تصویر | لینک | قیمت
  ok: boolean;
  fixed: boolean;
  detail: string;
}

export interface PriceHistoryRow {
  value: number;
  at: string; // ISO
  src: 'pipeline' | 'reprice' | 'bulk' | 'manual' | 'assistant' | 'initial' | 'auto';
}

export interface CardData {
  id: string;
  rawInput: string;
  inputType: string;
  name: string;
  nameFa: string;
  nameEn: string;
  description: string;
  usage: string;
  price: string;
  priceValue: number;
  priceSource: PriceSource[];
  priceHistory?: PriceHistoryRow[];
  link: string;
  imageUrl: string;
  specs: SpecItem[];
  issues: VerifyIssue[];
  status: string;
  error: string;
}

export interface JobState {
  id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  currentStage: string;
  stages: StageInfo[];
  error: string;
  watermarkMode: string;
  watermarkText: string;
  cards: CardData[];
}

export interface AssistantEdit {
  name?: string;
  description?: string;
  usage?: string;
  price?: string;
  specs?: SpecItem[];
}

export const STAGE_DEFS: { key: StageKey; title: string; desc: string }[] = [
  { key: 'naming', title: 'نام‌گذاری', desc: 'انتخاب بهترین عنوان بر اساس نتایج جستجو' },
  { key: 'pricing', title: 'قیمت‌گذاری', desc: 'استخراج قیمت از سایت‌های همکار صفحه اول جستجو' },
  { key: 'images', title: 'تصاویر و واترمارک', desc: 'جمع‌آوری تصویر و درج واترمارک شخصی‌سازی‌شده' },
  { key: 'verify', title: 'راستی‌آزمایی', desc: 'بررسی کامل بودن نام، تصویر، لینک و قیمت و اصلاح آدرس‌ها' },
  { key: 'optimize', title: 'بهینه‌سازی', desc: 'ویرایش متن، توضیحات، مشخصات و روش مصرف' },
  { key: 'build', title: 'ساخت کارت و صفحه محصول', desc: 'تولید HTML راست‌به‌چپ واکنش‌گرا و بسته‌بندی خروجی' },
];
