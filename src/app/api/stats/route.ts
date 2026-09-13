// GET /api/stats — آمار کلی داشبورد (کارت‌ها، پروسه‌ها، قیمت، تم‌ها، فعالیت هفتگی)
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CARD_THEMES, DEFAULT_THEME_KEY } from '@/lib/card-themes';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [jobsTotal, jobsDone, cardsTotal, cardsDone, doneCards, recentJobs] =
      await Promise.all([
        db.job.count(),
        db.job.count({ where: { status: 'done' } }),
        db.card.count(),
        db.card.count({ where: { status: 'done' } }),
        db.card.findMany({
          where: { status: 'done' },
          select: { priceValue: true, theme: true },
        }),
        db.job.findMany({
          where: { createdAt: { gte: weekAgo } },
          select: { createdAt: true, status: true },
        }),
      ]);

    const priced = doneCards.filter((c) => c.priceValue > 0);
    const avgPrice = priced.length
      ? Math.round(priced.reduce((s, c) => s + c.priceValue, 0) / priced.length)
      : 0;
    const minPrice = priced.length ? Math.min(...priced.map((c) => c.priceValue)) : 0;
    const maxPrice = priced.length ? Math.max(...priced.map((c) => c.priceValue)) : 0;

    // توزیع تم روی همه کارت‌های آماده
    const themeCounts: Record<string, number> = {};
    for (const c of doneCards) {
      const key = c.theme && CARD_THEMES[c.theme] ? c.theme : DEFAULT_THEME_KEY;
      themeCounts[key] = (themeCounts[key] || 0) + 1;
    }
    const themeDist = Object.entries(CARD_THEMES).map(([key, t]) => ({
      key,
      label: t.label,
      swatch: t.swatch[0],
      count: themeCounts[key] || 0,
    }));
    const topTheme = [...themeDist].sort((a, b) => b.count - a.count)[0] || null;

    // فعالیت ۷ روز اخیر (تعداد پروسه در هر روز)
    const week: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      const count = recentJobs.filter(
        (j) => j.createdAt >= d && j.createdAt < next,
      ).length;
      week.push({ date: d.toISOString(), count });
    }

    return NextResponse.json({
      ok: true,
      stats: {
        jobsTotal,
        jobsDone,
        cardsTotal,
        cardsDone,
        pricedCount: priced.length,
        avgPrice,
        minPrice,
        maxPrice,
        themeDist,
        topTheme,
        week,
      },
    });
  } catch (e) {
    console.error('stats error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در دریافت آمار' },
      { status: 500 },
    );
  }
}
