// POST /api/jobs/[id]/reprice — به‌روزرسانی گروهی قیمت همه کارت‌های آماده یک پروسه
// برای هر کارت: جستجوی تازه → میانه → حاشیه سود/رُند → ذخیره + تاریخچه + رندر مجدد HTML (+EN)
// پاسخ: خلاصه هر کارت (قدیم ← جدید) + شمار موفق/ناموفق برای دیالوگ نتیجه
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { repriceOneCard } from '@/lib/reprice';

export const runtime = 'nodejs';
export const maxDuration = 300;

// سقف کارت در هر درخواست (جستجوی وب پرهزینه است)
const MAX_CARDS = 12;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { cardIds?: string[] };
    const requestedIds = Array.isArray(body.cardIds) ? body.cardIds.filter(Boolean) : null;

    const job = await db.job.findUnique({
      where: { id },
      include: { cards: { orderBy: { createdAt: 'asc' } } },
    });
    if (!job) {
      return NextResponse.json({ ok: false, error: 'پروسه یافت نشد' }, { status: 404 });
    }

    let targets = job.cards.filter((c) => c.status === 'done' && c.html);
    if (requestedIds) targets = targets.filter((c) => requestedIds.includes(c.id));
    if (!targets.length) {
      return NextResponse.json(
        { ok: false, error: 'کارت آماده‌ای برای به‌روزرسانی قیمت در این پروسه نیست' },
        { status: 400 },
      );
    }
    const capped = targets.slice(0, MAX_CARDS);

    const results: {
      cardId: string;
      name: string;
      status: 'updated' | 'confirmed' | 'failed';
      oldPrice: number;
      newPrice: number;
      sourcesCount: number;
      error?: string;
    }[] = [];

    let updated = 0;
    let confirmed = 0;
    let failed = 0;

    for (const card of capped) {
      try {
        const outcome = await repriceOneCard(card, job, { srcTag: 'bulk' });
        if (outcome.ok) {
          if (outcome.newPrice !== outcome.oldPrice) updated++;
          else confirmed++;
          results.push({
            cardId: card.id,
            name: card.name || card.rawInput,
            status: outcome.newPrice !== outcome.oldPrice ? 'updated' : 'confirmed',
            oldPrice: outcome.oldPrice,
            newPrice: outcome.newPrice,
            sourcesCount: outcome.sourcesCount,
          });
        } else {
          failed++;
          results.push({
            cardId: card.id,
            name: card.name || card.rawInput,
            status: 'failed',
            oldPrice: card.priceValue,
            newPrice: card.priceValue,
            sourcesCount: 0,
            error: outcome.error || 'خطای ناشناخته',
          });
        }
      } catch (e) {
        failed++;
        results.push({
          cardId: card.id,
          name: card.name || card.rawInput,
          status: 'failed',
          oldPrice: card.priceValue,
          newPrice: card.priceValue,
          sourcesCount: 0,
          error: e instanceof Error ? e.message : 'خطای ناشناخته',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      total: capped.length,
      skipped: targets.length - capped.length,
      updated,
      confirmed,
      failed,
      results,
    });
  } catch (e) {
    console.error('job bulk reprice error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در به‌روزرسانی گروهی قیمت' },
      { status: 500 },
    );
  }
}
