// قالب‌ساز HTML کارت محصول — دقیقاً مطابق نمونه مرجع isadora.html
// راست‌به‌چپ، واکنش‌گرا، فونت وزیرمتن، تصویر Base64، قیمت با ارقام فارسی
// از نسخه تم‌دار: ۶ تم رنگی (card-themes.ts)

import { SpecItem } from '@/lib/types';
import { toFaDigits, slugifyFilename } from '@/lib/fa';
import { CardTheme, getTheme } from '@/lib/card-themes';

export interface CardTemplateInput {
  title: string; // عنوان دوزبانه نهایی
  description: string;
  price: string; // قالب‌بندی‌شده؛ خالی = نمایش داده نمی‌شود
  imageUrl: string; // data: یا https:
  specs: SpecItem[];
  usage?: string; // روش مصرف
  link?: string; // لینک مرجع محصول
  brand?: string; // واترمارک/برند کاربر برای فوتر کارت
  theme?: string; // کلید تم رنگی (پیش‌فرض: زمردی)
  lang?: 'fa' | 'en'; // زبان کارت (پیش‌فرض فارسی راست‌به‌چپ)
}

// ترجمه برچسب‌های ثابت قالب بر اساس زبان
const LABELS = {
  fa: {
    specsTitle: 'ویژگی‌های محصول',
    usageTitle: 'روش مصرف',
    linkBtn: 'مشاهده صفحه مرجع',
    footerPre: 'پردازش و بهینه‌سازی توسط',
    fallbackTitle: 'محصول',
  },
  en: {
    specsTitle: 'Product Specifications',
    usageTitle: 'How to Use',
    linkBtn: 'View Source Page',
    footerPre: 'Processed & optimized by',
    fallbackTitle: 'Product',
  },
} as const;

const esc = (s: string) =>
  (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function specsTable(specs: SpecItem[], t: CardTheme, L: (typeof LABELS)['fa' | 'en']): string {
  if (!specs.length) return '';
  const rows = specs
    .map(
      (s, i) => `              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid ${t.specsBorder}; color: ${t.specsKey}; font-size: 14px; width: 40%;">${esc(s.key)}</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid ${t.specsBorder}; color: ${t.specsValue}; font-size: 14px; font-weight: 500;">${esc(s.value)}</td>
              </tr>`,
    )
    .join('\n');
  return `      <div style="margin-top: 24px;">
        <h2 style="font-size: 18px; font-weight: 700; color: ${t.specsTitle}; margin-bottom: 16px;">${L.specsTitle}</h2>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid ${t.specsBorder}; border-radius: 12px; overflow: hidden;">
${rows}
        </table>
      </div>`;
}

function usageBlock(usage: string, t: CardTheme, L: (typeof LABELS)['fa' | 'en']): string {
  if (!usage?.trim()) return '';
  return `      <div style="margin-top: 20px; padding: 16px; background: ${t.usageBg}; border-radius: 12px; border: 1px solid ${t.usageBorder};">
        <h2 style="font-size: 16px; font-weight: 700; color: ${t.usageTitle}; margin-bottom: 8px;">${L.usageTitle}</h2>
        <p style="font-size: 14px; line-height: 1.9; color: ${t.usageText}; white-space: pre-line; margin: 0;">${esc(usage.trim())}</p>
      </div>`;
}

function priceBlock(price: string, t: CardTheme): string {
  if (!price?.trim()) return '';
  return `      <div style="margin-top: 20px; padding: 16px; background: ${t.priceBg}; border-radius: 12px; text-align: center;">
        <div style="font-size: 24px; font-weight: 800; color: ${t.priceColor};">${esc(price)}</div>
      </div>`;
}

function linkBlock(link: string, t: CardTheme, L: (typeof LABELS)['fa' | 'en']): string {
  if (!link || !/^https?:\/\//i.test(link)) return '';
  return `      <div style="margin-top: 16px; text-align: center;">
        <a href="${esc(link)}" target="_blank" rel="noopener" style="display: inline-block; padding: 10px 24px; background: ${t.linkBtnBg}; color: ${t.linkBtnText}; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none;">${L.linkBtn}</a>
      </div>`;
}

function footer(brand: string, t: CardTheme, L: (typeof LABELS)['fa' | 'en']): string {
  if (!brand?.trim()) return '';
  return `      <div style="margin-top: 20px; padding-top: 14px; border-top: 1px dashed ${t.footerBorder}; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span style="font-size: 12px; color: ${t.footerMuted};">${L.footerPre}</span>
        <span style="font-size: 12px; font-weight: 700; color: ${t.footerBrand};">${esc(brand)}</span>
      </div>`;
}

export function buildProductHtml(input: CardTemplateInput): string {
  const lang = input.lang === 'en' ? 'en' : 'fa';
  const L = LABELS[lang];
  const title = input.title || L.fallbackTitle;
  const t = getTheme(input.theme);
  const specs = specsTable(input.specs || [], t, L);
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${lang === 'en' ? 'ltr' : 'rtl'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Vazirmatn', sans-serif;
      background: ${t.pageBg};
      direction: ${lang === 'en' ? 'ltr' : 'rtl'};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .product-card {
      background: ${t.cardBg};
      border-radius: 20px;
      box-shadow: ${t.cardShadow};
      max-width: 480px;
      width: 100%;
      padding: 24px;
      overflow: hidden;
    }
    @media (max-width: 480px) {
      body { padding: 12px 8px; }
      .product-card { padding: 16px; border-radius: 16px; }
    }
  </style>
</head>
<body>
  <div class="product-card">
${input.imageUrl ? `      <div style="width: 100%; aspect-ratio: 1; background: ${t.pageBg}; border-radius: 16px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
        <img src="${input.imageUrl}" alt="${esc(title)}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>` : ''}
    <h1 style="font-size: 20px; font-weight: 700; color: ${t.heading}; line-height: 1.6; margin-bottom: 12px;">${esc(title)}</h1>
    <p style="font-size: 15px; line-height: 1.8; color: ${t.text}; white-space: pre-line;">${esc(input.description)}</p>
${priceBlock(input.price, t)}
${usageBlock(input.usage || '', t, L)}
${specs}
${linkBlock(input.link || '', t, L)}
${footer(input.brand || '', t, L)}
  </div>
</body>
</html>`;
}

export function cardFileName(title: string, id: string): string {
  return `${slugifyFilename(title, 'product-card')}-${id.slice(-6)}.html`;
}
