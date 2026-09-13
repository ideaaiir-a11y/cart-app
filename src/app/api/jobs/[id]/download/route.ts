// GET /api/jobs/[id]/download — خروجی ZIP همه کارت‌های تکمیل‌شده
// شامل: HTML هر کارت + JSON ساختاریافته هر کارت + cards.json تجمیعی + README
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import JSZip from 'jszip';
import { cardFileName } from '@/lib/card-template';
import { buildCardJson, PrismaCard } from '@/lib/card-json';
import { getTheme } from '@/lib/card-themes';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const job = await db.job.findUnique({
      where: { id },
      include: { cards: { where: { status: 'done' }, orderBy: { createdAt: 'asc' } } },
    });
    if (!job) {
      return NextResponse.json({ ok: false, error: 'پروسه یافت نشد' }, { status: 404 });
    }
    if (!job.cards.length) {
      return NextResponse.json({ ok: false, error: 'هنوز کارت تکمیل‌شده‌ای وجود ندارد' }, { status: 400 });
    }

    const zip = new JSZip();
    const used = new Set<string>();
    const allJson: unknown[] = [];

    for (const card of job.cards) {
      let name = cardFileName(card.name || card.rawInput || 'product', card.id);
      while (used.has(name)) name = name.replace(/\.html$/, `-${card.id.slice(-4)}.html`);
      used.add(name);
      zip.file(name, card.html || '');
      const json = buildCardJson(card as PrismaCard, job.watermarkText, job.cardTheme, name);
      zip.file(name.replace(/\.html$/, '.json'), JSON.stringify(json, null, 2));
      allJson.push(json);
      // نسخه انگلیسی (در صورت ساخت)
      if (card.htmlEn) {
        zip.file(name.replace(/\.html$/, '-en.html'), card.htmlEn);
      }
    }

    // فایل تجمیعی همه کارت‌ها
    zip.file(
      'cards.json',
      JSON.stringify(
        {
          generator: 'کارت‌ساز هوشمند محصول',
          jobId: job.id,
          generatedAt: new Date().toISOString(),
          brand: job.watermarkText,
          theme: getTheme(job.cardTheme).key,
          count: job.cards.length,
          cards: allJson,
        },
        null,
        2,
      ),
    );

    // README راهنما
    zip.file(
      'README.txt',
      [
        'کارت‌های محصول ساخته‌شده با «کارت‌ساز هوشمند محصول»',
        `پروژه: ${id}`,
        `تعداد کارت‌ها: ${job.cards.length}`,
        `واترمارک: ${job.watermarkMode === 'logo' ? 'لوگوی کاربر' : job.watermarkText}`,
        `تم رنگی: ${getTheme(job.cardTheme).label}`,
        `تاریخ: ${new Date().toLocaleDateString('fa-IR')}`,
        '',
        '├─ هر فایل HTML یک کارت محصول کامل، راست‌به‌چپ و واکنش‌گراست و تصویر با واترمارک به‌صورت پایه‌۶۴ داخل آن جاسازی شده است.',
        '├─ فایل‌های «-en.html»: نسخه انگلیسی چپ‌به‌راست همان کارت (در صورت ساخت).',
        '├─ فایل JSON هم‌نام هر کارت: داده ساختاریافته (نام، قیمت، مشخصات، منابع قیمت، راستی‌آزمایی و تصویر) برای مصرف برنامه‌ای.',
        '└─ cards.json: تجمیع داده همه کارت‌ها در یک فایل.',
      ].join('\n'),
    );

    const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="product-cards-${id.slice(-6)}.zip"`,
        'cache-control': 'no-store',
      },
    });
  } catch (e) {
    console.error('zip error:', e);
    return NextResponse.json({ ok: false, error: 'خطا در ساخت ZIP' }, { status: 500 });
  }
}
