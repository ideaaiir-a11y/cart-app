// GET /api/jobs/[id]/excel — خروجی اکسل همه کارت‌های یک پروسه
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildCardsWorkbook, parseSpecs, parseTags, lastPriceChange, ExcelCardRow } from '@/lib/card-excel';
import { getTheme } from '@/lib/card-themes';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const job = await db.job.findUnique({
      where: { id },
      include: { cards: { orderBy: { createdAt: 'asc' } } },
    });
    if (!job) return NextResponse.json({ ok: false, error: 'پروسه یافت نشد' }, { status: 404 });

    const rows: ExcelCardRow[] = job.cards.map((c) => ({
      name: c.name || c.rawInput,
      nameEn: c.nameEn,
      priceValue: c.priceValue,
      link: c.link,
      theme: c.theme || job.cardTheme,
      themeLabel: getTheme(c.theme || job.cardTheme).label,
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

    const { buffer, fileName } = await buildCardsWorkbook(rows, {
      title: 'کارت‌های پروسه',
      brand: job.watermarkText,
      fileNameBase: `cards-job-${id.slice(-6)}`,
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
    console.error('GET /api/jobs/[id]/excel error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در ساخت فایل اکسل' },
      { status: 500 },
    );
  }
}
