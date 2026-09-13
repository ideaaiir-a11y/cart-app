// POST /api/cards/[cardId]/image — جستجوی تصویر تازه + اعمال واترمارک شغل + رندر مجدد
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { imageSearch, fetchImage } from '@/lib/ai';
import { applyWatermark, toDataUrl, WatermarkPos, watermarkScale } from '@/lib/watermark';
import { buildProductHtml } from '@/lib/card-template';
import { SpecItem } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await ctx.params;
    const card = await db.card.findUnique({ where: { id: cardId }, include: { job: true } });
    if (!card) return NextResponse.json({ ok: false, error: 'کارت یافت نشد' }, { status: 404 });

    const job = card.job;
    const query = `product photo of ${card.nameEn || card.name || card.rawInput} white background`;

    let buf: Buffer | null = null;
    const hits = await imageSearch(query, 8);
    for (const hit of hits) {
      const got = await fetchImage(hit.original_url);
      if (got) {
        buf = got.buf;
        break;
      }
    }
    if (!buf) {
      return NextResponse.json({ ok: false, error: 'تصویر تازه‌ای پیدا نشد؛ بعداً تلاش کنید' }, { status: 404 });
    }

    const wm = await applyWatermark(buf, {
      mode: (job.watermarkMode as 'text' | 'logo') || 'text',
      text: job.watermarkMode === 'text' ? job.watermarkText : undefined,
      logoBuf: job.watermarkMode === 'logo' && job.watermarkLogo?.startsWith('data:')
        ? Buffer.from(job.watermarkLogo.split(',')[1] || '', 'base64')
        : undefined,
      pos: (job.watermarkPos as WatermarkPos) || 'bottom-right',
      scale: watermarkScale(job.watermarkSize),
      font: job.watermarkFont || 'vazirmatn',
    });
    const imageUrl = toDataUrl(wm.buf, 'image/png');

    // رندر مجدد HTML با تصویر تازه
    let specs: SpecItem[] = [];
    try {
      specs = JSON.parse(card.specs || '[]');
    } catch { /* ignore */ }
    const html = buildProductHtml({
      title: card.name || card.rawInput || 'محصول',
      description: card.description,
      price: card.price,
      imageUrl,
      specs,
      usage: card.usage,
      link: card.link,
      brand: job.watermarkText,
      theme: card.theme || job.cardTheme,
    });

    const updated = await db.card.update({ where: { id: cardId }, data: { imageUrl, html } });

    return NextResponse.json({
      ok: true,
      card: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        usage: updated.usage,
        price: updated.price,
        priceValue: updated.priceValue,
        specs,
        imageUrl: updated.imageUrl,
        link: updated.link,
        theme: updated.theme || job.cardTheme,
        html: updated.html,
        status: updated.status,
      },
    });
  } catch (e) {
    console.error('card image refresh error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در تازه‌سازی تصویر' },
      { status: 500 },
    );
  }
}
