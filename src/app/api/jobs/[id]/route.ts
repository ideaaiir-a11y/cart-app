// GET /api/jobs/[id] — وضعیت + کارت‌ها | DELETE — حذف پروسه
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { StageInfo, PriceSource, SpecItem, VerifyIssue } from '@/lib/types';

export const runtime = 'nodejs';

function mapCard(c: {
  id: string;
  rawInput: string;
  inputType: string;
  name: string;
  nameFa: string;
  nameEn: string;
  description: string;
  usage: string;
  price: string;
  priceValue: number;
  priceSource: string;
  priceHistory: string;
  link: string;
  imageUrl: string;
  specs: string;
  html: string;
  htmlEn: string;
  theme: string;
  tags: string;
  issues: string;
  status: string;
  error: string;
}) {
  return {
    id: c.id,
    rawInput: c.rawInput,
    inputType: c.inputType,
    name: c.name,
    nameFa: c.nameFa,
    nameEn: c.nameEn,
    description: c.description,
    usage: c.usage,
    price: c.price,
    priceValue: c.priceValue,
    priceSource: safeParse<PriceSource[]>(c.priceSource, []),
    priceHistory: safeParse<{ value: number; at: string; src: string }[]>(c.priceHistory, []),
    link: c.link,
    imageUrl: c.imageUrl,
    specs: safeParse<SpecItem[]>(c.specs, []),
    issues: safeParse<VerifyIssue[]>(c.issues, []),
    html: c.html || '',
    hasEn: !!c.htmlEn,
    theme: c.theme || '',
    tags: safeParse<string[]>(c.tags, []),
    status: c.status,
    error: c.error,
  };
}

function safeParse<T>(s: string, fallback: T): T {
  try {
    const v = JSON.parse(s || 'null');
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const job = await db.job.findUnique({ where: { id }, include: { cards: { orderBy: { createdAt: 'asc' } } } });
    if (!job) {
      return NextResponse.json({ ok: false, error: 'پروسه یافت نشد' }, { status: 404 });
    }
    const stages = safeParse<StageInfo[]>(job.stagesLog, []);
    return NextResponse.json({
      ok: true,
      job: {
        id: job.id,
        status: job.status,
        currentStage: job.currentStage,
        stages,
        error: job.error,
        watermarkText: job.watermarkText,
        watermarkMode: job.watermarkMode,
        cardTheme: job.cardTheme || 'emerald',
        cards: job.cards.map(mapCard),
      },
    });
  } catch (e) {
    console.error('GET job error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در دریافت وضعیت' },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // تلاش مجدد برای خطاهای گذرا (قفل SQLite) — «یافت نشد» یعنی قبلاً حذف شده و موفق است
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.job.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('P2025')) {
        return NextResponse.json({ ok: true, alreadyGone: true });
      }
      if (attempt === 2) {
        console.error('DELETE job error:', msg);
        return NextResponse.json({ ok: false, error: 'حذف ناموفق' }, { status: 500 });
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return NextResponse.json({ ok: false, error: 'حذف ناموفق' }, { status: 500 });
}
