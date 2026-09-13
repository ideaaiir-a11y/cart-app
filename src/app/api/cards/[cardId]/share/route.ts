// GET /api/cards/[cardId]/share — صفحه عمومی اشتراک‌گذاری کارت (HTML مستقل)
// همان کارت خروجی + متاتگ‌های اشتراک‌گذاری + داده ساختاریافته Product (سئو) + نوار برند
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const esc = (s: string) =>
  (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export async function GET(req: NextRequest, ctx: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await ctx.params;
  const printMode = req.nextUrl.searchParams.get('print') === '1';
  const card = await db.card.findUnique({ where: { id: cardId }, include: { job: true } });
  if (!card || card.status !== 'done' || !card.html) {
    return new NextResponse(
      `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>کارت یافت نشد</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#666">این کارت در دسترس نیست یا حذف شده است.</body></html>`,
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  const title = card.name || card.rawInput || 'محصول';
  const description = (card.description || '').slice(0, 200);
  const brand = card.job.watermarkText || '';

  // داده ساختاریافته Product برای سئو و پیش‌نمایش پیام‌رسان‌ها
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: card.description || undefined,
  };
  if (card.imageUrl?.startsWith('http')) jsonLd.image = card.imageUrl;
  if (card.priceValue > 0) {
    jsonLd.offers = {
      '@type': 'Offer',
      price: card.priceValue,
      priceCurrency: 'IRR',
      availability: 'https://schema.org/InStock',
    };
  }

  const banner = `
<style>
  .cm-share-bar{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;background:rgba(15,23,42,.88);backdrop-filter:blur(8px);z-index:99;font-family:'Vazirmatn',sans-serif;}
  .cm-share-bar span{font-size:12px;color:#e2e8f0;}
  .cm-share-bar b{font-size:12.5px;color:#6ee7b7;}
  body{padding-bottom:52px !important;}
</style>
<div class="cm-share-bar" dir="rtl">
  <span>این کارت محصول با</span>
  <b>کارت‌ساز هوشمند محصول</b>
  <span>ساخته شده است${brand ? ` — ${esc(brand)}` : ''}</span>
</div>`;

  // استایل و اسکریپت حالت چاپ/PDF — کارت در وسط A4 با رنگ‌های کامل
  const printPack = printMode
    ? `
<style>
  @page{size:A4 portrait;margin:10mm;}
  html,body{print-color-adjust:exact;-webkit-print-color-adjust:exact;background:#fff !important;}
  @media print{
    .cm-share-bar{display:none !important;}
    body{padding:0 !important;margin:0 auto !important;width:auto !important;min-height:0 !important;}
    body>*{box-shadow:none !important;}
  }
  @media screen{
    .cm-print-hint{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:100;background:#059669;color:#fff;font-family:'Vazirmatn',sans-serif;font-size:12.5px;padding:9px 18px;border-radius:999px;box-shadow:0 8px 24px rgba(5,150,105,.35);}
  }
</style>
<div class="cm-print-hint" dir="rtl">پنجره چاپ باز می‌شود — «Save as PDF» را انتخاب کنید</div>
<script>
  window.addEventListener('load',function(){
    setTimeout(function(){ try{ window.print(); }catch(e){} },550);
  });
</script>`
    : '';

  let html = card.html;
  // تزریق متاتگ‌ها بعد از تگ title
  const metaTags = `
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`;
  html = html.replace(/(<title>[^<]*<\/title>)/i, `$1\n${metaTags}`);
  // تزریق نوار اشتراک + بسته چاپ قبل از بسته‌شدن body
  html = html.replace(/<\/body>/i, `${banner}\n${printPack}\n</body>`);

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': printMode ? 'no-store' : 'public, max-age=300',
    },
  });
}
