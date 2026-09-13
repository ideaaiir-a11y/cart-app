// GET /api/cards — کتابخانه سراسری کارت‌ها (همه پروسه‌ها)
// پارامترها: q (جستجو)، theme (فیلتر تم)، tag (فیلتر برچسب)، sort (newest|oldest|name|price-asc|price-desc)، limit، offset
// خروجی سبک — بدون html و imageUrl (سنگین)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get('q') || '').trim().slice(0, 80);
    const theme = (sp.get('theme') || '').trim();
    const tag = (sp.get('tag') || '').trim();
    const sort = (sp.get('sort') || 'newest').trim();
    const limit = Math.min(120, Math.max(1, Number(sp.get('limit')) || 60));
    const offset = Math.max(0, Number(sp.get('offset')) || 0);
    const all = sp.get('all') === '1'; // شامل کارت‌های ناتمام

    const where: Prisma.CardWhereInput = {};
    if (!all) where.status = 'done';
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { nameFa: { contains: q } },
        { nameEn: { contains: q } },
        { rawInput: { contains: q } },
      ];
    }
    if (theme) where.theme = theme;
    if (tag) where.tags = { contains: `"${tag}"` };

    const orderBy: Prisma.CardOrderByWithRelationInput[] =
      sort === 'oldest'
        ? [{ createdAt: 'asc' }]
        : sort === 'name'
          ? [{ name: 'asc' }]
          : sort === 'price-asc'
            ? [{ priceValue: 'asc' }]
            : sort === 'price-desc'
              ? [{ priceValue: 'desc' }]
              : [{ createdAt: 'desc' }];

    const [cards, total] = await Promise.all([
      db.card.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          id: true,
          jobId: true,
          rawInput: true,
          name: true,
          nameFa: true,
          nameEn: true,
          price: true,
          priceValue: true,
          link: true,
          theme: true,
          tags: true,
          specs: true,
          usage: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.card.count({ where }),
    ]);

    // توزیع تم‌ها برای چیپ‌های فیلتر
    const themeGroups = await db.card.groupBy({
      by: ['theme'],
      _count: { _all: true },
      where: all ? {} : { status: 'done' },
    });

    // توزیع برچسب‌ها (روی همه کارت‌های همسان با فیلترهای غیر-برچسب)
    const tagRows = await db.card.findMany({
      where: all ? {} : { status: 'done' },
      select: { tags: true },
    });
    const tagCounts = new Map<string, number>();
    for (const r of tagRows) {
      try {
        const arr = JSON.parse(r.tags || '[]');
        if (Array.isArray(arr)) {
          for (const t of arr) {
            if (typeof t === 'string' && t.trim()) {
              tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
            }
          }
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      ok: true,
      total,
      cards: cards.map((c) => {
        let specsCount = 0;
        let tags: string[] = [];
        try {
          const v = JSON.parse(c.specs || '[]');
          specsCount = Array.isArray(v) ? v.length : 0;
        } catch { /* ignore */ }
        try {
          const t = JSON.parse(c.tags || '[]');
          tags = Array.isArray(t) ? t.filter((x) => typeof x === 'string' && x.trim()) : [];
        } catch { /* ignore */ }
        return {
          id: c.id,
          jobId: c.jobId,
          rawInput: c.rawInput,
          name: c.name || c.rawInput,
          nameEn: c.nameEn,
          price: c.price,
          priceValue: c.priceValue,
          link: c.link,
          theme: c.theme,
          tags,
          specsCount,
          hasUsage: !!c.usage,
          status: c.status,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        };
      }),
      themes: themeGroups
        .map((g) => ({ theme: g.theme || 'emerald', count: g._count._all }))
        .sort((a, b) => b.count - a.count),
      tags: [...tagCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 24),
    });
  } catch (e) {
    console.error('GET /api/cards error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در دریافت کتابخانه کارت‌ها' },
      { status: 500 },
    );
  }
}
