// POST /api/cards/[cardId] — ویرایش دستی/برنامه‌ای کارت و رندر مجدد HTML
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildProductHtml } from '@/lib/card-template';
import { getTheme } from '@/lib/card-themes';
import { extractPriceCandidates, formatToman, toEnDigits, sanitizeFaText, sanitizeSpecs } from '@/lib/fa';
import { pushPriceHistory } from '@/lib/reprice';
import { SpecItem } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, ctx: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await ctx.params;
    const card = await db.card.findUnique({ where: { id: cardId }, include: { job: true } });
    if (!card) return NextResponse.json({ ok: false, error: 'کارت یافت نشد' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
      usage?: string;
      price?: string | number;
      specs?: SpecItem[];
      theme?: string; // تغییر تم رنگی کارت
      tags?: string[]; // برچسب‌ها
    };

    const data: Record<string, string | number> = {};

    if (typeof body.name === 'string' && body.name.trim()) data.name = sanitizeFaText(body.name).slice(0, 300);
    if (typeof body.description === 'string' && body.description.trim()) data.description = sanitizeFaText(body.description).slice(0, 4000);
    if (typeof body.usage === 'string') data.usage = sanitizeFaText(body.usage).slice(0, 2000);

    let priceValue = card.priceValue;
    if (body.price !== undefined && body.price !== null && body.price !== '') {
      if (typeof body.price === 'number' && isFinite(body.price) && body.price > 0) {
        priceValue = Math.round(body.price);
      } else {
        const nums = extractPriceCandidates(toEnDigits(String(body.price)));
        if (nums.length) priceValue = medianOf(nums);
      }
    }
    data.price = priceValue > 0 ? formatToman(priceValue) : '';
    data.priceValue = priceValue > 0 ? priceValue : 0;
    // ثبت در قیمت‌نگار فقط وقتی قیمت واقعاً تغییر کرده
    if (priceValue > 0 && priceValue !== card.priceValue) {
      data.priceHistory = JSON.stringify(pushPriceHistory(card.priceHistory, priceValue, 'manual'));
    }

    if (Array.isArray(body.specs)) {
      const clean = sanitizeSpecs(
        body.specs
          .filter((s) => s && typeof s.key === 'string' && typeof s.value === 'string' && s.key.trim() && s.value.trim())
          .slice(0, 16),
      ).map((s) => ({ key: s.key.slice(0, 80), value: s.value.slice(0, 200) }));
      data.specs = JSON.stringify(clean);
    }

    const effectiveTheme = getTheme(body.theme || card.theme || card.job.cardTheme).key;
    if (body.theme !== undefined || !card.theme) data.theme = effectiveTheme;

    // برچسب‌ها — پاک‌سازی، یکتاسازی و سقف ۸ برچسب با حداکثر ۲۴ نویسه
    if (Array.isArray(body.tags)) {
      const seen = new Set<string>();
      const clean: string[] = [];
      for (const t of body.tags) {
        if (typeof t !== 'string') continue;
        const v = t.trim().slice(0, 24);
        if (v && !seen.has(v) && clean.length < 8) {
          seen.add(v);
          clean.push(v);
        }
      }
      data.tags = JSON.stringify(clean);
    }

    // اگر محتوای اصلی تغییر کرد، نسخه انگلیسی قدیمی نامعتبر است
    const contentChanged = ['name', 'description', 'usage', 'specs'].some((k) => k in data);
    if (contentChanged) {
      data.htmlEn = '';
      data.descriptionEn = '';
      data.usageEn = '';
      data.specsEn = '[]';
    }

    const updated = await db.card.update({ where: { id: cardId }, data, include: { job: true } });
    const job = updated.job;

    // رندر مجدد HTML با داده تازه و تم فعال
    let specs: SpecItem[] = [];
    try {
      specs = JSON.parse(updated.specs || '[]');
    } catch { /* ignore */ }
    const title = updated.name || updated.rawInput || 'محصول';
    const html = buildProductHtml({
      title,
      description: updated.description,
      price: updated.price,
      imageUrl: updated.imageUrl,
      specs,
      usage: updated.usage,
      link: updated.link,
      brand: job.watermarkText,
      theme: updated.theme || job.cardTheme,
    });
    const final = await db.card.update({
      where: { id: cardId },
      data: { html, status: updated.imageUrl || updated.description ? 'done' : card.status },
    });

    // تغییر تم → رندر مجدد HTML انگلیسی از محتوای ذخیره‌شده (بدون فراخوانی مجدد مدل)
    let htmlEnOut: string | undefined;
    if (final.htmlEn && (body.theme !== undefined || effectiveTheme !== card.theme)) {
      let specsEn: SpecItem[] = [];
      try {
        specsEn = JSON.parse(final.specsEn || '[]');
      } catch { /* ignore */ }
      const priceEn = final.priceValue > 0 ? `${final.priceValue.toLocaleString('en-US')} Toman` : '';
      const enTitle = final.nameEn || final.name || final.rawInput || 'Product';
      htmlEnOut = buildProductHtml({
        title: enTitle,
        description: final.descriptionEn,
        price: priceEn,
        imageUrl: final.imageUrl,
        specs: specsEn,
        usage: final.usageEn,
        link: final.link,
        brand: job.watermarkText,
        theme: final.theme || job.cardTheme,
        lang: 'en',
      });
      await db.card.update({ where: { id: cardId }, data: { htmlEn: htmlEnOut } });
    }

    return NextResponse.json({
      ok: true,
      card: {
        id: final.id,
        name: final.name,
        description: final.description,
        usage: final.usage,
        price: final.price,
        priceValue: final.priceValue,
        specs: specs,
        imageUrl: final.imageUrl,
        link: final.link,
        theme: final.theme || job.cardTheme,
        tags: (() => {
          try {
            const t = JSON.parse(final.tags || '[]');
            return Array.isArray(t) ? t : [];
          } catch {
            return [];
          }
        })(),
        html: final.html,
        status: final.status,
      },
    });
  } catch (e) {
    console.error('card update error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در ویرایش کارت' },
      { status: 500 },
    );
  }
}

// DELETE /api/cards/[cardId] — حذف یک کارت
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await ctx.params;
    const card = await db.card.findUnique({ where: { id: cardId }, select: { id: true } });
    if (!card) return NextResponse.json({ ok: false, error: 'کارت یافت نشد' }, { status: 404 });
    await db.card.delete({ where: { id: cardId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/cards/[cardId] error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در حذف کارت' },
      { status: 500 },
    );
  }
}

function medianOf(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}
