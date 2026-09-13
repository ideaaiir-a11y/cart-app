// POST /api/cards/[cardId]/reprice — به‌روزرسانی قیمت کارت با جستجوی تازه
// جستجوی قیمت از سایت‌ها → میانه → حاشیه سود/رُند پروسه → ذخیره + تاریخچه + رندر مجدد HTML
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { repriceOneCard } from '@/lib/reprice';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await ctx.params;
    const card = await db.card.findUnique({ where: { id: cardId }, include: { job: true } });
    if (!card) return NextResponse.json({ ok: false, error: 'کارت یافت نشد' }, { status: 404 });
    if (card.status !== 'done') {
      return NextResponse.json(
        { ok: false, error: 'فقط کارت‌های آماده قابل به‌روزرسانی قیمت هستند' },
        { status: 400 },
      );
    }

    const outcome = await repriceOneCard(card, card.job, { srcTag: 'reprice' });
    if (!outcome.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            outcome.error === 'قیمت تازه‌ای یافت نشد'
              ? 'قیمت تازه‌ای در نتایج جستجو یافت نشد — قیمت قبلی حفظ شد'
              : outcome.error,
        },
        { status: outcome.error === 'نام محصول برای جستجو موجود نیست' ? 400 : 404 },
      );
    }

    const updated = await db.card.findUnique({ where: { id: cardId } });

    return NextResponse.json({
      ok: true,
      found: outcome.found,
      oldPrice: outcome.oldPrice,
      newPrice: outcome.newPrice,
      marketPrice: outcome.marketPrice,
      appliedMarkup: outcome.appliedMarkup,
      appliedRound: outcome.appliedRound,
      sourcesCount: outcome.sourcesCount,
      card: {
        id: cardId,
        name: updated?.name ?? card.name,
        description: updated?.description ?? card.description,
        usage: updated?.usage ?? card.usage,
        price: updated?.price ?? card.price,
        priceValue: updated?.priceValue ?? outcome.newPrice,
        specs: (() => {
          try {
            return JSON.parse((updated?.specs ?? card.specs) || '[]');
          } catch {
            return [];
          }
        })(),
        imageUrl: updated?.imageUrl ?? card.imageUrl,
        link: updated?.link ?? card.link,
        theme: updated?.theme || card.job.cardTheme,
        html: updated?.html ?? card.html,
        status: 'done',
        hasEn: !!updated?.htmlEn,
      },
    });
  } catch (e) {
    console.error('card reprice error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در به‌روزرسانی قیمت' },
      { status: 500 },
    );
  }
}
