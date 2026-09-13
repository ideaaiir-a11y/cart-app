// GET /api/cards/excel — خروجی اکسل کتابخانه کارت‌ها (با همان فیلترهای کتابخانه)
// پارامترها: q، theme، tag، sort — بدون صفحه‌بندی (سقف ۵۰۰ کارت)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { buildCardsWorkbook, parseSpecs, parseTags, lastPriceChange, ExcelCardRow } from '@/lib/card-excel';
import { getTheme } from '@/lib/card-themes';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get('q') || '').trim().slice(0, 80);
    const theme = (sp.get('theme') || '').trim();
    const tag = (sp.get('tag') || '').trim();
    const sort = (sp.get('sort') || 'newest').trim();

    const where: Prisma.CardWhereInput = { status: 'done' };
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

    const cards = await db.card.findMany({
      where,
      orderBy,
      take: 500,
      include: { job: { select: { watermarkText: true, cardTheme: true } } },
    });

    const rows: ExcelCardRow[] = cards.map((c) => ({
      name: c.name || c.rawInput,
      nameEn: c.nameEn,
      priceValue: c.priceValue,
      link: c.link,
      theme: c.theme || c.job.cardTheme,
      themeLabel: getTheme(c.theme || c.job.cardTheme).label,
      specsCount: parseSpecs(c.specs).length,
      specs: parseSpecs(c.specs),
      usage: c.usage,
      tags: parseTags(c.tags),
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      priceHistoryCount: (() => {
        try {
          const v = JSON.parse(c.priceHistory || '[]');
          return Array.isArray(v) ? v.length : 0;
        } catch {
          return 0;
        }
      })(),
      lastChange: lastPriceChange(c.priceHistory),
    }));

    const brand = cards[0]?.job?.watermarkText || '';
    const { buffer, fileName } = await buildCardsWorkbook(rows, {
      title: 'کتابخانه کارت‌ها',
      brand,
      fileNameBase: 'cards-library',
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'X-File-Name': encodeURIComponent(fileName),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('GET /api/cards/excel error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در ساخت فایل اکسل کتابخانه' },
      { status: 500 },
    );
  }
}
