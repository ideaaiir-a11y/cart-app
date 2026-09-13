// ─────────────────────────────────────────────────────────────
// خروجی JSON ساختاریافته هر کارت — برای مصرف برنامه‌ای (فروشگاه‌سازها، APIها)
// ─────────────────────────────────────────────────────────────
import { PriceSource, SpecItem, VerifyIssue, PriceHistoryRow } from '@/lib/types';

/** شکل ردیف Card در Prisma (بدون فیلدهای relation) */
export interface PrismaCard {
  id: string;
  jobId: string;
  rawInput: string;
  inputType: string;
  name: string;
  nameFa: string;
  nameEn: string;
  description: string;
  usage: string;
  price: string;
  priceValue: number;
  priceSource: string;
  priceHistory: string;
  link: string;
  imageUrl: string;
  specs: string;
  tags: string;
  issues: string;
  html: string;
  theme: string;
  status: string;
  error: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardJson {
  id: string;
  generator: string;
  generatedAt: string;
  name: { fa: string; en: string; full: string };
  description: string;
  usage: string;
  price: {
    formatted: string;
    value: number;
    currency: string;
    sources: PriceSource[];
    history: PriceHistoryRow[];
  };
  link: string;
  specs: SpecItem[];
  tags: string[];
  verification: VerifyIssue[];
  theme: string;
  image: {
    embedded: boolean;
    format: string;
    dataUrl: string;
  };
  files: { html: string; json: string };
}

function safeParse<T>(s: string, fallback: T): T {
  try {
    const v = JSON.parse(s || 'null');
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function buildCardJson(
  card: PrismaCard & { html?: string },
  jobBrand: string,
  jobTheme: string,
  htmlFileName?: string,
): CardJson {
  const title = card.name || card.rawInput || 'محصول';
  const themeKey = (card as { theme?: string }).theme || jobTheme || 'emerald';
  const isData = card.imageUrl?.startsWith('data:');
  const htmlName = htmlFileName || `${title}-${card.id.slice(-6)}.html`;
  return {
    id: card.id,
    generator: 'کارت‌ساز هوشمند محصول',
    generatedAt: new Date().toISOString(),
    name: {
      fa: card.nameFa || '',
      en: card.nameEn || '',
      full: title,
    },
    description: card.description || '',
    usage: card.usage || '',
    price: {
      formatted: card.price || '',
      value: card.priceValue || 0,
      currency: 'IRT',
      sources: safeParse<PriceSource[]>(card.priceSource, []),
      history: safeParse<PriceHistoryRow[]>(card.priceHistory, []),
    },
    link: card.link || '',
    specs: safeParse<SpecItem[]>(card.specs, []),
    tags: safeParse<string[]>(card.tags, []),
    verification: safeParse<VerifyIssue[]>(card.issues, []),
    theme: themeKey,
    image: {
      embedded: !!card.imageUrl,
      format: isData ? 'png' : 'url',
      dataUrl: card.imageUrl || '',
    },
    files: { html: htmlName, json: htmlName.replace(/\.html$/, '.json') },
  };
}

export { safeParse };
