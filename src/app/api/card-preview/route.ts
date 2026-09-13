// GET /api/card-preview?theme=X — پیش‌نمایش زنده قالب کارت با محصول نمونه
import { NextRequest, NextResponse } from 'next/server';
import { buildProductHtml } from '@/lib/card-template';
import { getTheme } from '@/lib/card-themes';
import { SpecItem } from '@/lib/types';

export const runtime = 'nodejs';

// تصویر نمونه SVG داخلی (بدون نیاز به اینترنت)
function sampleImage(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0fdf4"/>
      <stop offset="1" stop-color="#d1fae5"/>
    </linearGradient>
    <linearGradient id="bottle" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e5e7eb"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <circle cx="300" cy="255" r="150" fill="#ffffff" opacity="0.7"/>
  <rect x="255" y="165" width="90" height="130" rx="14" fill="url(#bottle)" stroke="#16a34a" stroke-width="4"/>
  <rect x="277" y="135" width="46" height="36" rx="8" fill="#16a34a"/>
  <rect x="270" y="215" width="60" height="60" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="300" y="252" text-anchor="middle" font-size="20" font-weight="bold" fill="#16a34a" font-family="sans-serif">SPF</text>
  <text x="300" y="470" text-anchor="middle" font-size="34" font-weight="bold" fill="#065f46" font-family="sans-serif">Pharm Pure</text>
  <text x="300" y="515" text-anchor="middle" font-size="24" fill="#047857" font-family="sans-serif">نمونه تصویر محصول</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const SAMPLE_SPECS: SpecItem[] = [
  { key: 'حجم', value: '۵۰ میلی‌لیتر' },
  { key: 'نوع پوست', value: 'همه انواع پوست' },
  { key: 'ضریب محافظت', value: 'SPF 50+' },
  { key: 'کشور سازنده', value: 'آلمان' },
];

export async function GET(req: NextRequest) {
  try {
    const theme = getTheme(req.nextUrl.searchParams.get('theme')).key;
    const html = buildProductHtml({
      title: 'کرم آفتاب فارما پیور SPF50 | Pharm Pure Sunscreen',
      description:
        'کرم آفتاب فارما پیور با ضریب محافظت ۵۰+، مناسب همه انواع پوست، بدون چربی و با جذب سریع. محافظت پایا در برابر اشعه UVA و UVB و مقاوم در برابر آب و عرق.',
      price: '۲۴۸٬۰۰۰ تومان',
      imageUrl: sampleImage(),
      specs: SAMPLE_SPECS,
      usage:
        'روزی دو بار، صبح و عصر، مقدار کافی از کرم را روی پوست صورت و گردن بمالید. ۱۵ دقیقه قبل از قرارگیری در معرض آفتاب استفاده شود.',
      link: 'https://example.com/product/sample',
      brand: 'فروشگاه نمونه',
      theme,
    });
    return NextResponse.json({ ok: true, theme, html });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در ساخت پیش‌نمایش' },
      { status: 500 },
    );
  }
}
