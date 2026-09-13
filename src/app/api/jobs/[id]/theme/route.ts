// POST /api/jobs/[id]/theme — اعمال گروهی تم روی همه کارت‌های یک پروسه + بازرندر HTML
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildProductHtml } from '@/lib/card-template';
import { getTheme } from '@/lib/card-themes';
import { SpecItem } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { theme?: string };
    const themeKey = getTheme(body.theme).key;

    const job = await db.job.findUnique({ where: { id }, include: { cards: true } });
    if (!job) {
      return NextResponse.json({ ok: false, error: 'پروسه یافت نشد' }, { status: 404 });
    }

    await db.job.update({ where: { id }, data: { cardTheme: themeKey } });

    let updated = 0;
    for (const card of job.cards) {
      // کارت‌های آماده: بازرندر کامل HTML با تم جدید
      if (card.html) {
        let specs: SpecItem[] = [];
        try {
          specs = JSON.parse(card.specs || '[]');
        } catch {
          specs = [];
        }
        const html = buildProductHtml({
          title: card.name || card.rawInput || 'محصول',
          description: card.description,
          price: card.price,
          imageUrl: card.imageUrl,
          specs,
          usage: card.usage,
          link: card.link,
          brand: job.watermarkText,
          theme: themeKey,
        });
        await db.card.update({
          where: { id: card.id },
          data: { theme: themeKey, html },
        });
        // بازرندر نسخه انگلیسی موجود با تم جدید (بدون فراخوانی مجدد مدل)
        if (card.htmlEn) {
          let specsEn: SpecItem[] = [];
          try {
            specsEn = JSON.parse(card.specsEn || '[]');
          } catch {
            specsEn = [];
          }
          const priceEn = card.priceValue > 0 ? `${card.priceValue.toLocaleString('en-US')} Toman` : '';
          const htmlEn = buildProductHtml({
            title: card.nameEn || card.name || card.rawInput || 'Product',
            description: card.descriptionEn,
            price: priceEn,
            imageUrl: card.imageUrl,
            specs: specsEn,
            usage: card.usageEn,
            link: card.link,
            brand: job.watermarkText,
            theme: themeKey,
            lang: 'en',
          });
          await db.card.update({ where: { id: card.id }, data: { htmlEn } });
        }
      } else {
        // کارت‌های ناتمام: فقط تم ذخیره می‌شود
        await db.card.update({ where: { id: card.id }, data: { theme: themeKey } });
      }
      updated++;
    }

    return NextResponse.json({ ok: true, theme: themeKey, updated });
  } catch (e) {
    console.error('bulk theme error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در اعمال گروهی تم' },
      { status: 500 },
    );
  }
}
