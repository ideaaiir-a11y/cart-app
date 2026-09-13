// ─────────────────────────────────────────────────────────────
// قیمت‌نگار — هسته مشترک به‌روزرسانی قیمت و تاریخچه قیمت کارت
// استفاده در: /api/cards/[cardId]/reprice، /api/jobs/[id]/reprice (گروهی)
// ─────────────────────────────────────────────────────────────
import { db } from '@/lib/db';
import { webSearch } from '@/lib/ai';
import { buildProductHtml } from '@/lib/card-template';
import { applyJobPrice } from '@/lib/pricing';
import { extractPriceCandidates, median, formatToman } from '@/lib/fa';
import { PriceSource, SpecItem } from '@/lib/types';

/** یک ردیف تاریخچه قیمت */
export interface PriceHistoryRow {
  value: number;
  at: string; // ISO date
  src: 'pipeline' | 'reprice' | 'bulk' | 'manual' | 'assistant' | 'initial' | 'auto';
}

/** شکل فیلدهای موردنیاز کارت (از Prisma یا پاسخ API) */
export interface RepriceCardShape {
  id: string;
  rawInput: string;
  name: string;
  nameFa: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  usage: string;
  usageEn: string;
  price: string;
  priceValue: number;
  priceSource: string;
  priceHistory: string;
  specs: string;
  specsEn: string;
  link: string;
  imageUrl: string;
  theme: string;
  html: string;
  htmlEn: string;
  status: string;
}

export interface RepriceJobShape {
  watermarkText: string;
  cardTheme: string;
  priceMarkup: number;
  priceRound: number;
}

/** افزودن ردیف به تاریخچه قیمت (حداکثر ۴۰ ردیف نگه داشته می‌شود) */
export function pushPriceHistory(
  currentJson: string,
  value: number,
  src: PriceHistoryRow['src'],
  at?: string,
): PriceHistoryRow[] {
  let rows: PriceHistoryRow[] = [];
  try {
    const parsed = JSON.parse(currentJson || '[]');
    if (Array.isArray(parsed)) rows = parsed.filter((r) => r && typeof r.value === 'number');
  } catch {
    rows = [];
  }
  // اگر آخرین ردیف همان مقدار و همان منبع است، فقط زمانش را تازه کن
  const last = rows[rows.length - 1];
  if (last && last.value === value && last.src === src) {
    last.at = at || new Date().toISOString();
    return rows.slice(-40);
  }
  rows.push({ value, at: at || new Date().toISOString(), src });
  return rows.slice(-40);
}

export interface MarketPriceResult {
  marketPrice: number;
  sources: PriceSource[];
}

/** جستجوی تازه قیمت + استخراج میانه با فیلتر پرت‌ها (منطق مشترک) */
export async function searchMarketPrice(queryName: string): Promise<MarketPriceResult> {
  const q = `قیمت ${queryName} تومان`;
  const results = await webSearch(q, 10);
  const sources: PriceSource[] = [];
  for (const r of results.slice(0, 8)) {
    const prices = extractPriceCandidates(`${r.name} ${r.snippet}`);
    for (const price of prices.slice(0, 2)) {
      sources.push({ site: r.host_name, price, url: r.url });
    }
  }
  if (!sources.length) return { marketPrice: 0, sources: [] };

  // فیلتر مقادیر پرت (همان منطق پایپ‌لاین)
  const vals = sources.map((s) => s.price).sort((a, b) => a - b);
  const q1 = vals[Math.floor(vals.length * 0.2)];
  const q3 = vals[Math.floor(vals.length * 0.8)];
  const filtered = sources.filter((s) => s.price >= q1 * 0.5 && s.price <= q3 * 2);
  const picked = filtered.length ? filtered : sources;
  return { marketPrice: median(picked.map((s) => s.price)), sources: picked };
}

/** تنظیمات حاشیه سود/رُند کاربر؛ fallback به مقادیر پروسه */
export async function resolveMarkupRound(
  job: RepriceJobShape,
): Promise<{ markup: number; round: number }> {
  const settingRows = await db.setting.findMany({
    where: { key: { in: ['priceMarkup', 'priceRound'] } },
  });
  const sMap = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));
  const sMarkupRaw = sMap.priceMarkup !== undefined ? Number(sMap.priceMarkup) : NaN;
  const sRoundRaw = sMap.priceRound !== undefined ? Number(sMap.priceRound) : NaN;
  const markup = isFinite(sMarkupRaw) ? Math.max(0, Math.min(90, Math.round(sMarkupRaw))) : job.priceMarkup;
  const round = [0, 1000, 5000, 10000].includes(Math.round(sRoundRaw))
    ? Math.round(sRoundRaw)
    : job.priceRound;
  return { markup, round };
}

/** رندر مجدد HTML فارسی + انگلیسی کارت با داده‌های تازه */
export function renderCardHtml(
  card: RepriceCardShape,
  job: RepriceJobShape,
  priceStr: string,
  priceValue: number,
): { html: string; htmlEn?: string } {
  let specs: SpecItem[] = [];
  try {
    specs = JSON.parse(card.specs || '[]');
  } catch {
    specs = [];
  }
  const theme = card.theme || job.cardTheme;
  const html = buildProductHtml({
    title: card.name || card.rawInput || 'محصول',
    description: card.description,
    price: priceStr,
    imageUrl: card.imageUrl,
    specs,
    usage: card.usage,
    link: card.link,
    brand: job.watermarkText,
    theme,
  });

  let htmlEn: string | undefined;
  if (card.htmlEn) {
    let specsEn: SpecItem[] = [];
    try {
      specsEn = JSON.parse(card.specsEn || '[]');
    } catch {
      specsEn = [];
    }
    const priceEn = priceValue > 0 ? `${priceValue.toLocaleString('en-US')} Toman` : '';
    htmlEn = buildProductHtml({
      title: card.nameEn || card.name || card.rawInput || 'Product',
      description: card.descriptionEn,
      price: priceEn,
      imageUrl: card.imageUrl,
      specs: specsEn,
      usage: card.usageEn,
      link: card.link,
      brand: job.watermarkText,
      theme,
      lang: 'en',
    });
  }
  return { html, htmlEn };
}

export interface RepriceOutcome {
  ok: boolean;
  found: boolean;
  error?: string;
  oldPrice: number;
  newPrice: number;
  marketPrice: number;
  sourcesCount: number;
  appliedMarkup?: number;
  appliedRound?: number;
}

/**
 * قیمت‌گذاری مجدد یک کارت و ذخیره کامل (قیمت + تاریخچه + HTML + EN)
 * تاریخچه فقط وقتی ثبت می‌شود که قیمت واقعاً عوض شده یا منبع «bulk/initial» است.
 */
export async function repriceOneCard(
  card: RepriceCardShape,
  job: RepriceJobShape,
  opts: { srcTag: PriceHistoryRow['src']; keepIfMissing?: boolean },
): Promise<RepriceOutcome> {
  const queryName = card.nameFa || card.name || card.rawInput;
  if (!queryName) {
    return { ok: false, found: false, error: 'نام محصول برای جستجو موجود نیست', oldPrice: card.priceValue, newPrice: card.priceValue, marketPrice: 0, sourcesCount: 0 };
  }

  const { marketPrice, sources } = await searchMarketPrice(queryName);
  if (!marketPrice) {
    return { ok: false, found: false, error: 'قیمت تازه‌ای یافت نشد', oldPrice: card.priceValue, newPrice: card.priceValue, marketPrice: 0, sourcesCount: 0 };
  }

  const { markup, round } = await resolveMarkupRound(job);
  const priced = applyJobPrice(marketPrice, markup, round);

  // منابع یکتا، حداکثر ۶ سایت
  const seen = new Set<string>();
  const freshSources = sources
    .filter((s) => (seen.has(s.site) ? false : (seen.add(s.site), true)))
    .slice(0, 6);

  const priceStr = priced.value > 0 ? formatToman(priced.value) : '';
  const changed = priced.value !== card.priceValue;

  // تاریخچه: ثبت در تغییر، یا اولین ثبت (تاریخچه خالی)
  let historyJson = card.priceHistory;
  if (changed || !historyJson || historyJson === '[]') {
    const rows = pushPriceHistory(card.priceHistory, priced.value, opts.srcTag);
    historyJson = JSON.stringify(rows);
  }

  const { html, htmlEn } = renderCardHtml(card, job, priceStr, priced.value);

  await db.card.update({
    where: { id: card.id },
    data: {
      price: priceStr,
      priceValue: priced.value,
      priceSource: JSON.stringify(freshSources),
      priceHistory: historyJson,
      html,
      ...(htmlEn ? { htmlEn } : {}),
    },
  });

  return {
    ok: true,
    found: true,
    oldPrice: card.priceValue,
    newPrice: priced.value,
    marketPrice,
    sourcesCount: freshSources.length,
    appliedMarkup: priced.markup,
    appliedRound: priced.round,
  };
}
