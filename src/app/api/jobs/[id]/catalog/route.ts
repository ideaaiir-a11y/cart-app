// GET /api/jobs/[id]/catalog — کاتالوگ چاپی/PDF کل پروسه (جلد + یک صفحه برای هر کارت)
// ?print=1 → @page A4 + رنگ کامل + پنهان‌سازی نوار برند + اسکریپت auto window.print
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { formatToman } from '@/lib/fa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const esc = (s: string) =>
  (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const printMode = req.nextUrl.searchParams.get('print') === '1';

  const job = await db.job.findUnique({
    where: { id },
    include: { cards: { where: { status: 'done', html: { not: '' } }, orderBy: { createdAt: 'asc' } } },
  });
  if (!job) {
    return new NextResponse(
      `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>پروسه یافت نشد</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#666">این پروسه در دسترس نیست یا حذف شده است.</body></html>`,
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }
  if (!job.cards.length) {
    return new NextResponse(
      `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>کاتالوگ خالی</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#666">هنوز کارت آماده‌ای در این پروسه نیست.</body></html>`,
      { status: 409, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  const brand = job.watermarkText || 'کارت‌ساز هوشمند محصول';
  const total = job.cards.reduce((sum, c) => sum + (c.priceValue || 0), 0);
  const dateFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date());
  const pricedCount = job.cards.filter((c) => c.priceValue > 0).length;

  // فهرست کالاها (جلد)
  const toc = job.cards
    .map(
      (c, i) => `
      <li>
        <span class="toc-idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="toc-name">${esc(c.name || c.rawInput || 'محصول')}</span>
        <span class="toc-dot"></span>
        <span class="toc-price">${c.priceValue > 0 ? esc(formatToman(c.priceValue)) : '—'}</span>
      </li>`,
    )
    .join('');

  // صفحات کارت‌ها: هر کارت در iframe ایزوله (بدون تداخل CSS بین قالب‌ها)
  const pages = job.cards
    .map((c, i) => {
      const title = esc(c.name || c.rawInput || 'محصول');
      const price = c.priceValue > 0 ? esc(formatToman(c.priceValue)) : '';
      return `
  <section class="sheet">
    <header class="sheet-head">
      <span class="sheet-brand">${esc(brand)}</span>
      <span class="sheet-title">${title}</span>
      <span class="sheet-num">${new Intl.NumberFormat('fa-IR').format(i + 1)}</span>
    </header>
    <div class="card-frame-wrap">
      <iframe
        srcdoc="${esc(c.html).replace(/"/g, '&quot;')}"
        title="کارت ${title}"
        scrolling="no"
        class="card-frame"
      ></iframe>
    </div>
    <footer class="sheet-foot">
      ${price ? `<span class="sheet-price">${price} <small>تومان</small></span>` : '<span></span>'}
      <span class="sheet-page">صفحه ${new Intl.NumberFormat('fa-IR').format(i + 1)} از ${new Intl.NumberFormat('fa-IR').format(job.cards.length)}</span>
    </footer>
  </section>`;
    })
    .join('');

  const printPack = printMode
    ? `
<style>
  @page{size:A4 portrait;margin:8mm;}
  html,body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
  .cm-toolbar{display:none !important;}
  .sheet{margin:0 !important;box-shadow:none !important;border-radius:0 !important;width:auto !important;}
  main{gap:0 !important;}
</style>
<script>
  window.addEventListener('load',function(){
    setTimeout(function(){ try{ window.print(); }catch(e){} },800);
  });
</script>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>کاتالوگ ${esc(brand)} — ${new Intl.NumberFormat('fa-IR').format(job.cards.length)} محصول</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    font-family:'Vazirmatn',sans-serif;background:#eef2f0;color:#1e293b;
    padding:24px 16px 90px;-webkit-font-smoothing:antialiased;
  }
  main{max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:28px;align-items:center;}

  /* ── جلد کاتالوگ ── */
  .cover{
    width:100%;min-height:1080px;border-radius:22px;overflow:hidden;position:relative;
    background:linear-gradient(150deg,#065f46 0%,#059669 42%,#10b981 70%,#f59e0b 130%);
    color:#fff;display:flex;flex-direction:column;justify-content:space-between;
    padding:56px 48px;box-shadow:0 24px 60px rgba(6,95,70,.25);
  }
  .cover::before{content:'';position:absolute;inset:0;
    background-image:radial-gradient(rgba(255,255,255,.14) 1.2px,transparent 1.2px);
    background-size:26px 26px;opacity:.5;}
  .cover-top{position:relative;display:flex;justify-content:space-between;align-items:flex-start;}
  .cover-badge{background:rgba(255,255,255,.16);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.35);
    padding:8px 18px;border-radius:999px;font-size:13px;font-weight:600;}
  .cover-mid{position:relative;text-align:center;}
  .cover-kicker{font-size:15px;font-weight:300;letter-spacing:.2em;opacity:.85;margin-bottom:14px;}
  .cover-title{font-size:52px;font-weight:800;line-height:1.25;text-shadow:0 3px 14px rgba(0,0,0,.22);}
  .cover-brand{margin-top:16px;font-size:24px;font-weight:600;color:#fde68a;}
  .cover-stats{position:relative;display:flex;justify-content:center;gap:14px;margin-top:34px;flex-wrap:wrap;}
  .stat{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(6px);
    border-radius:16px;padding:14px 26px;text-align:center;min-width:130px;}
  .stat b{display:block;font-size:23px;font-weight:800;}
  .stat span{font-size:12px;opacity:.85;}
  .cover-bottom{position:relative;}
  .toc{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(8px);
    border-radius:18px;padding:26px 30px;max-height:430px;overflow:hidden;}
  .toc h2{font-size:16px;font-weight:700;margin-bottom:14px;color:#fde68a;}
  .toc ul{list-style:none;display:flex;flex-direction:column;gap:9px;}
  .toc li{display:flex;align-items:baseline;gap:10px;font-size:13.5px;}
  .toc-idx{font-weight:800;opacity:.75;min-width:24px;font-size:12px;}
  .toc-name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px;}
  .toc-dot{flex:1;border-bottom:1.5px dotted rgba(255,255,255,.35);transform:translateY(-3px);}
  .toc-price{font-weight:700;color:#a7f3d0;white-space:nowrap;}
  .cover-date{margin-top:16px;text-align:center;font-size:12.5px;opacity:.8;}

  /* ── صفحات کارت ── */
  .sheet{
    width:100%;background:#fff;border-radius:18px;padding:26px 28px 20px;
    box-shadow:0 12px 34px rgba(15,23,42,.12);display:flex;flex-direction:column;gap:14px;
  }
  .sheet-head{display:flex;align-items:center;gap:12px;border-bottom:2px solid #059669;padding-bottom:10px;}
  .sheet-brand{font-size:12px;font-weight:700;color:#059669;background:#ecfdf5;border:1px solid #a7f3d0;
    padding:4px 12px;border-radius:999px;white-space:nowrap;}
  .sheet-title{flex:1;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sheet-num{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#059669,#10b981);
    color:#fff;font-size:12.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .card-frame-wrap{display:flex;justify-content:center;}
  .card-frame{width:480px;height:764px;border:0;transform-origin:top center;transform:scale(.92);margin-bottom:-61px;background:#fff;border-radius:12px;}
  .sheet-foot{display:flex;justify-content:space-between;align-items:center;border-top:1px dashed #cbd5e1;padding-top:10px;}
  .sheet-price{font-size:16px;font-weight:800;color:#059669;}
  .sheet-price small{font-size:11px;font-weight:500;color:#64748b;}
  .sheet-page{font-size:11px;color:#94a3b8;}

  /* ── نوار ابزار (فقط صفحه) ── */
  .cm-toolbar{position:fixed;bottom:0;left:0;right:0;z-index:99;display:flex;align-items:center;justify-content:center;gap:12px;
    padding:12px 16px;background:rgba(15,23,42,.92);backdrop-filter:blur(8px);}
  .cm-toolbar span{font-size:12.5px;color:#e2e8f0;}
  .cm-toolbar button{font-family:'Vazirmatn',sans-serif;font-size:13px;font-weight:700;cursor:pointer;
    background:#059669;color:#fff;border:0;border-radius:999px;padding:9px 26px;box-shadow:0 6px 18px rgba(5,150,105,.4);}
  .cm-toolbar button:hover{background:#047857;}
  body{padding-bottom:96px;}

  ${printMode ? `
  @media print{
    body{padding:0;background:#fff;}
    main{gap:0;max-width:100%;}
    .cover{min-height:275mm;border-radius:0;box-shadow:none;page-break-after:always;}
    .sheet{page-break-after:always;border-radius:0;box-shadow:none;padding:0;}
    .sheet:last-child{page-break-after:auto;}
  }` : ''}
</style>
</head>
<body>
<main>
  <section class="cover">
    <div class="cover-top">
      <span class="cover-badge">کاتالوگ محصولات</span>
      <span class="cover-badge">${esc(dateFa)}</span>
    </div>
    <div class="cover-mid">
      <p class="cover-kicker">قیمت‌ها به‌روز — تومان</p>
      <h1 class="cover-title">کاتالوگ محصولات</h1>
      <p class="cover-brand">${esc(brand)}</p>
      <div class="cover-stats">
        <div class="stat"><b>${new Intl.NumberFormat('fa-IR').format(job.cards.length)}</b><span>محصول</span></div>
        <div class="stat"><b>${new Intl.NumberFormat('fa-IR').format(pricedCount)}</b><span>دارای قیمت</span></div>
        <div class="stat"><b>${new Intl.NumberFormat('fa-IR').format(total)}</b><span>جمع ارزش (تومان)</span></div>
      </div>
    </div>
    <div class="cover-bottom">
      <div class="toc">
        <h2>فهرست کالاها</h2>
        <ul>${toc}</ul>
      </div>
      <p class="cover-date">تولید و پردازش خودکار با «کارت‌ساز هوشمند محصول» — ${esc(dateFa)}</p>
    </div>
  </section>
  ${pages}
</main>
<div class="cm-toolbar" dir="rtl">
  <button type="button" onclick="window.print()">چاپ / ذخیره PDF</button>
  <span>کاتالوگ با ${new Intl.NumberFormat('fa-IR').format(job.cards.length)} محصول — آماده چاپ A4</span>
</div>
${printPack}
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': printMode ? 'no-store' : 'public, max-age=120',
    },
  });
}
