// ─────────────────────────────────────────────────────────────
// خروجی اکسل (xlsx) کارت‌ها — با استایل فارسی و شیت راست‌به‌چپ
// استفاده در: /api/jobs/[id]/excel (پروسه) و /api/cards/excel (کتابخانه)
// ─────────────────────────────────────────────────────────────
import ExcelJS from 'exceljs';
import { PriceHistoryRow, SpecItem } from '@/lib/types';

export interface ExcelCardRow {
  name: string;
  nameEn: string;
  priceValue: number;
  link: string;
  theme: string;
  themeLabel: string;
  specsCount: number;
  specs: SpecItem[];
  usage: string;
  tags: string[];
  status: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  priceHistoryCount: number;
  lastPriceChange?: string; // ISO
}

export interface ExcelMeta {
  title: string; // عنوان دفترچه (نام پروسه یا کتابخانه)
  brand: string; // برند/واترمارک
  fileNameBase: string;
}

const HEAD_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF047857' }, // زمردی تیره
};

const ZEBRA_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF0FDF4' }, // زمردی بسیار روشن
};

const SUMMARY_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFBEB' }, // کهربایی بسیار روشن
};

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };
}

function faDate(iso: string): string {
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fa-IR');
  } catch {
    return '';
  }
}

function faDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** برچسب فارسی منبع تغییر قیمت */
function srcLabel(src?: string): string {
  switch (src) {
    case 'pipeline': return 'پایپ‌لاین';
    case 'reprice': return 'قیمت روز';
    case 'bulk': return 'گروهی';
    case 'manual': return 'دستی';
    case 'assistant': return 'دستیار';
    case 'auto': return 'خودکار شبانه';
    case 'initial': return 'اولیه';
    default: return '';
  }
}

/**
 * ساخت فایل اکسل با دو شیت:
 *  ۱) «کارت‌ها» — جدول کامل با سربرگ رنگی، نوار یک‌درمیان و قالب عدد قیمت
 *  ۲) «خلاصه» — آمار کلی، توزیع تم‌ها و برچسب‌ها
 */
export async function buildCardsWorkbook(
  rows: ExcelCardRow[],
  meta: ExcelMeta,
): Promise<{ buffer: Buffer; fileName: string }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'کارت‌ساز هوشمند محصول';
  wb.created = new Date();

  /* ── شیت ۱: کارت‌ها ─────────────────────────────── */
  const ws = wb.addWorksheet('کارت‌ها', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 3 }],
    properties: { defaultRowHeight: 20 },
  });

  ws.columns = [
    { key: 'row', width: 6 },
    { key: 'name', width: 38 },
    { key: 'nameEn', width: 26 },
    { key: 'price', width: 16 },
    { key: 'specsCount', width: 10 },
    { key: 'theme', width: 12 },
    { key: 'tags', width: 24 },
    { key: 'usage', width: 34 },
    { key: 'link', width: 34 },
    { key: 'history', width: 12 },
    { key: 'lastChange', width: 18 },
    { key: 'createdAt', width: 13 },
    { key: 'status', width: 10 },
  ];

  // ردیف ۱: عنوان بزرگ برند
  ws.mergeCells('A1:M1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${meta.brand || 'فروشگاه من'} — ${meta.title}`;
  titleCell.font = { name: 'Vazirmatn', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF065F46' }, // زمردی خیلی تیره
  };
  ws.getRow(1).height = 30;

  // ردیف ۲: توضیح کوچک
  ws.mergeCells('A2:M2');
  const subCell = ws.getCell('A2');
  subCell.value = `تولیدشده توسط کارت‌ساز هوشمند محصول • ${faDateTime(new Date().toISOString())} • ${rows.length.toLocaleString('fa-IR')} کارت`;
  subCell.font = { name: 'Vazirmatn', size: 9, color: { argb: 'FF6B7280' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 16;

  // ردیف ۳: سربرگ ستون‌ها
  const headers = [
    '#',
    'نام محصول',
    'نام لاتین',
    'قیمت (تومان)',
    'مشخصات',
    'تم قالب',
    'برچسب‌ها',
    'روش مصرف',
    'لینک مرجع',
    'تاریخچه قیمت',
    'آخرین تغییر قیمت',
    'تاریخ ایجاد',
    'وضعیت',
  ];
  const headerRow = ws.getRow(3);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Vazirmatn', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = HEAD_FILL;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder();
  });

  // داده‌ها
  rows.forEach((r, i) => {
    const history: PriceHistoryRow[] = [];
    const statusFa = r.status === 'done' ? 'آماده' : r.status === 'error' ? 'خطا' : 'در جریان';
    const row = ws.addRow([
      i + 1,
      r.name || '',
      r.nameEn || '',
      r.priceValue > 0 ? r.priceValue : null,
      r.specsCount,
      r.themeLabel,
      r.tags.join('، '),
      r.usage ? r.usage.slice(0, 200) : '',
      r.link || '',
      r.priceHistoryCount,
      r.lastPriceChange ? faDateTime(r.lastPriceChange) : '—',
      faDate(r.createdAt),
      statusFa,
    ]);
    row.height = 22;
    row.eachCell((cell, col) => {
      cell.font = { name: 'Vazirmatn', size: 10 };
      cell.alignment = {
        horizontal: col === 2 || col === 8 || col === 9 ? 'right' : 'center',
        vertical: 'middle',
        wrapText: col === 2 || col === 8,
      };
      cell.border = thinBorder();
      if (i % 2 === 1) cell.fill = ZEBRA_FILL;
    });
    // قالب عدد قیمت
    const priceCell = row.getCell('price');
    priceCell.numFmt = '#,##0';
    priceCell.font = { name: 'Vazirmatn', size: 10, bold: true, color: { argb: 'FF047857' } };
    // لینک کلیک‌پذیر
    const linkCell = row.getCell('link');
    if (r.link && /^https?:\/\//.test(r.link)) {
      linkCell.value = { text: r.link, hyperlink: r.link };
      linkCell.font = { name: 'Vazirmatn', size: 9, color: { argb: 'FF1D4ED8' }, underline: true };
    }
  });

  // فیلتر خودکار
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + rows.length, column: 13 } };

  /* ── شیت ۲: خلاصه ─────────────────────────────── */
  const sum = wb.addWorksheet('خلاصه', { views: [{ rightToLeft: true }] });
  sum.columns = [
    { key: 'a', width: 30 },
    { key: 'b', width: 22 },
  ];

  const priced = rows.filter((r) => r.priceValue > 0);
  const prices = priced.map((r) => r.priceValue);
  const avg = prices.length ? Math.round(prices.reduce((s, v) => s + v, 0) / prices.length) : 0;

  // توزیع تم‌ها
  const themeDist = new Map<string, number>();
  const tagDist = new Map<string, number>();
  for (const r of rows) {
    themeDist.set(r.themeLabel, (themeDist.get(r.themeLabel) || 0) + 1);
    for (const t of r.tags) tagDist.set(t, (tagDist.get(t) || 0) + 1);
  }

  sum.mergeCells('A1:B1');
  const sumTitle = sum.getCell('A1');
  sumTitle.value = `خلاصه آماری — ${meta.title}`;
  sumTitle.font = { name: 'Vazirmatn', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  sumTitle.fill = HEAD_FILL;
  sumTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  sum.getRow(1).height = 28;

  const stats: [string, string | number][] = [
    ['تعداد کل کارت‌ها', rows.length.toLocaleString('fa-IR')],
    ['کارت‌های دارای قیمت', priced.length.toLocaleString('fa-IR')],
    ['میانگین قیمت (تومان)', avg.toLocaleString('fa-IR')],
    ['ارزان‌ترین (تومان)', prices.length ? Math.min(...prices).toLocaleString('fa-IR') : '—'],
    ['گران‌ترین (تومان)', prices.length ? Math.max(...prices).toLocaleString('fa-IR') : '—'],
    ['مجموع ارزش ویترین (تومان)', prices.reduce((s, v) => s + v, 0).toLocaleString('fa-IR')],
    ['تاریخ تهیه گزارش', faDateTime(new Date().toISOString())],
  ];
  for (const [k, v] of stats) {
    const row = sum.addRow([k, v]);
    row.height = 22;
    row.getCell('a').font = { name: 'Vazirmatn', size: 10, bold: true };
    row.getCell('b').font = { name: 'Vazirmatn', size: 10 };
    row.getCell('a').alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell('b').alignment = { horizontal: 'center', vertical: 'middle' };
    row.eachCell((c) => {
      c.border = thinBorder();
    });
  }

  // توزیع تم‌ها
  sum.addRow([]);
  const thRow = sum.addRow(['توزیع تم‌های قالب', 'شمار کارت']);
  thRow.eachCell((c) => {
    c.font = { name: 'Vazirmatn', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = HEAD_FILL;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  for (const [t, n] of [...themeDist.entries()].sort((a, b) => b[1] - a[1])) {
    const row = sum.addRow([t, n.toLocaleString('fa-IR')]);
    row.getCell('a').font = { name: 'Vazirmatn', size: 10 };
    row.getCell('b').font = { name: 'Vazirmatn', size: 10 };
    row.getCell('a').alignment = { horizontal: 'right' };
    row.getCell('b').alignment = { horizontal: 'center' };
    row.eachCell((c) => {
      c.border = thinBorder();
      c.fill = SUMMARY_FILL;
    });
  }

  // برچسب‌ها
  if (tagDist.size) {
    sum.addRow([]);
    const tagRow = sum.addRow(['برچسب‌ها', 'شمار کارت']);
    tagRow.eachCell((c) => {
      c.font = { name: 'Vazirmatn', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = HEAD_FILL;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    for (const [t, n] of [...tagDist.entries()].sort((a, b) => b[1] - a[1])) {
      const row = sum.addRow([t, n.toLocaleString('fa-IR')]);
      row.getCell('a').font = { name: 'Vazirmatn', size: 10 };
      row.getCell('b').font = { name: 'Vazirmatn', size: 10 };
      row.getCell('a').alignment = { horizontal: 'right' };
      row.getCell('b').alignment = { horizontal: 'center' };
      row.eachCell((c) => {
        c.border = thinBorder();
        c.fill = ZEBRA_FILL;
      });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const fileName = `${meta.fileNameBase}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { buffer: Buffer.from(buffer), fileName };
}

/** تجزیه امن JSON مشخصات */
export function parseSpecs(json: string): SpecItem[] {
  try {
    const v = JSON.parse(json || '[]');
    return Array.isArray(v) ? v.filter((s) => s && typeof s.key === 'string') : [];
  } catch {
    return [];
  }
}

/** تجزیه امن JSON برچسب‌ها */
export function parseTags(json: string): string[] {
  try {
    const v = JSON.parse(json || '[]');
    return Array.isArray(v) ? v.filter((t) => typeof t === 'string' && t.trim()).slice(0, 8) : [];
  } catch {
    return [];
  }
}

/** آخرین تغییر قیمت از تاریخچه */
export function lastPriceChange(json: string): string | undefined {
  try {
    const v = JSON.parse(json || '[]') as PriceHistoryRow[];
    if (!Array.isArray(v) || !v.length) return undefined;
    return v[v.length - 1]?.at;
  } catch {
    return undefined;
  }
}
