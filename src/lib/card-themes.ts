// ─────────────────────────────────────────────────────────────
// تم‌های رنگی قالب کارت محصول — ۶ تم آماده
// هر تم تمام رنگ‌های بلاک‌های کارت (قیمت، روش مصرف، جدول، لینک، فوتر) را تعیین می‌کند
// ─────────────────────────────────────────────────────────────

export interface CardTheme {
  key: string;
  label: string; // نام فارسی تم
  swatch: string[]; // رنگ‌های نمای کوچک برای انتخابگر UI
  dark?: boolean;
  pageBg: string; // پس‌زمینه صفحه
  cardBg: string; // پس‌زمینه کارت
  cardShadow: string; // سایه کارت
  heading: string; // رنگ عنوان
  text: string; // رنگ متن توضیحات
  priceBg: string; // پس‌زمینه بلاک قیمت
  priceColor: string; // رنگ عدد قیمت
  usageBg: string; // پس‌زمینه بلاک روش مصرف
  usageBorder: string;
  usageTitle: string;
  usageText: string;
  specsBorder: string; // خطوط جدول مشخصات
  specsKey: string;
  specsValue: string;
  specsTitle: string; // عنوان «ویژگی‌های محصول»
  linkBtnBg: string; // دکمه لینک مرجع
  linkBtnText: string;
  footerBorder: string;
  footerMuted: string;
  footerBrand: string;
}

export const CARD_THEMES: Record<string, CardTheme> = {
  emerald: {
    key: 'emerald',
    label: 'زمردی',
    swatch: ['#16a34a', '#f0fdf4', '#854d0e'],
    pageBg: '#f3f4f6',
    cardBg: '#ffffff',
    cardShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    heading: '#111827',
    text: '#4b5563',
    priceBg: '#f0fdf4',
    priceColor: '#16a34a',
    usageBg: '#fefce8',
    usageBorder: '#fde68a',
    usageTitle: '#854d0e',
    usageText: '#a16207',
    specsBorder: '#e5e7eb',
    specsKey: '#6b7280',
    specsValue: '#111827',
    specsTitle: '#111827',
    linkBtnBg: '#111827',
    linkBtnText: '#ffffff',
    footerBorder: '#e5e7eb',
    footerMuted: '#9ca3af',
    footerBrand: '#16a34a',
  },
  rose: {
    key: 'rose',
    label: 'سرخابی',
    swatch: ['#e11d48', '#fff1f2', '#9f1239'],
    pageBg: '#faf5f6',
    cardBg: '#ffffff',
    cardShadow: '0 4px 24px rgba(190, 18, 60, 0.10)',
    heading: '#1f1214',
    text: '#57534e',
    priceBg: '#fff1f2',
    priceColor: '#e11d48',
    usageBg: '#fdf4f5',
    usageBorder: '#fecdd3',
    usageTitle: '#9f1239',
    usageText: '#be123c',
    specsBorder: '#fce7ea',
    specsKey: '#9b8a8d',
    specsValue: '#27191c',
    specsTitle: '#1f1214',
    linkBtnBg: '#e11d48',
    linkBtnText: '#ffffff',
    footerBorder: '#fce7ea',
    footerMuted: '#b3a3a6',
    footerBrand: '#e11d48',
  },
  violet: {
    key: 'violet',
    label: 'بنفش',
    swatch: ['#7c3aed', '#f5f3ff', '#5b21b6'],
    pageBg: '#f7f6fb',
    cardBg: '#ffffff',
    cardShadow: '0 4px 24px rgba(109, 40, 217, 0.10)',
    heading: '#191329',
    text: '#4e495e',
    priceBg: '#f5f3ff',
    priceColor: '#7c3aed',
    usageBg: '#faf9ff',
    usageBorder: '#ddd6fe',
    usageTitle: '#5b21b6',
    usageText: '#6d28d9',
    specsBorder: '#ede9fe',
    specsKey: '#7d7691',
    specsValue: '#221a38',
    specsTitle: '#191329',
    linkBtnBg: '#7c3aed',
    linkBtnText: '#ffffff',
    footerBorder: '#ede9fe',
    footerMuted: '#a49bc0',
    footerBrand: '#7c3aed',
  },
  amber: {
    key: 'amber',
    label: 'طلایی',
    swatch: ['#b45309', '#fffbeb', '#78350f'],
    pageBg: '#faf7f0',
    cardBg: '#fffdf8',
    cardShadow: '0 4px 24px rgba(180, 83, 9, 0.12)',
    heading: '#2b1d0e',
    text: '#5c5142',
    priceBg: '#fef3c7',
    priceColor: '#b45309',
    usageBg: '#fff7e0',
    usageBorder: '#fde68a',
    usageTitle: '#78350f',
    usageText: '#92400e',
    specsBorder: '#f3e8cf',
    specsKey: '#8b7f6b',
    specsValue: '#2e2313',
    specsTitle: '#2b1d0e',
    linkBtnBg: '#b45309',
    linkBtnText: '#ffffff',
    footerBorder: '#f3e8cf',
    footerMuted: '#b0a48d',
    footerBrand: '#b45309',
  },
  teal: {
    key: 'teal',
    label: 'فیروزه‌ای',
    swatch: ['#0d9488', '#f0fdfa', '#115e59'],
    pageBg: '#f2f8f7',
    cardBg: '#ffffff',
    cardShadow: '0 4px 24px rgba(13, 148, 136, 0.12)',
    heading: '#0f1f1d',
    text: '#435551',
    priceBg: '#f0fdfa',
    priceColor: '#0d9488',
    usageBg: '#effaf7',
    usageBorder: '#99f6e4',
    usageTitle: '#115e59',
    usageText: '#0f766e',
    specsBorder: '#dcf1ee',
    specsKey: '#6b8380',
    specsValue: '#132724',
    specsTitle: '#0f1f1d',
    linkBtnBg: '#0d9488',
    linkBtnText: '#ffffff',
    footerBorder: '#dcf1ee',
    footerMuted: '#93aca8',
    footerBrand: '#0d9488',
  },
  midnight: {
    key: 'midnight',
    label: 'شبانه',
    swatch: ['#34d399', '#1e293b', '#0f172a'],
    dark: true,
    pageBg: '#0b1220',
    cardBg: '#162032',
    cardShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
    heading: '#f1f5f9',
    text: '#b6c2d4',
    priceBg: 'rgba(52, 211, 153, 0.12)',
    priceColor: '#34d399',
    usageBg: 'rgba(251, 191, 36, 0.10)',
    usageBorder: 'rgba(251, 191, 36, 0.35)',
    usageTitle: '#fbbf24',
    usageText: '#fcd34d',
    specsBorder: '#2b3a52',
    specsKey: '#8fa1ba',
    specsValue: '#e4ecf6',
    specsTitle: '#f1f5f9',
    linkBtnBg: '#34d399',
    linkBtnText: '#06281c',
    footerBorder: '#2b3a52',
    footerMuted: '#6f819c',
    footerBrand: '#34d399',
  },
};

export const DEFAULT_THEME_KEY = 'emerald';

/** تم معتبر را برمی‌گرداند؛ در صورت نامعتبر بودن تم پیش‌فرض */
export function getTheme(key?: string | null): CardTheme {
  return (key && CARD_THEMES[key]) || CARD_THEMES[DEFAULT_THEME_KEY];
}

/** فهرست تم‌ها برای UI */
export const THEME_LIST: { key: string; label: string; swatch: string[] }[] = Object.values(
  CARD_THEMES,
).map(({ key, label, swatch }) => ({ key, label, swatch }));
