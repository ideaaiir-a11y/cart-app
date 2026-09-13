// POST /api/jobs — ساخت Job جدید از ورودی‌های multipart
// GET  /api/jobs — فهرست تاریخچه پروسه‌ها (سبک، بدون html/تصویر)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseLines, parseFiles, mergeSeeds, SeedProduct } from '@/lib/parse-input';
import { getTheme } from '@/lib/card-themes';
import { WATERMARK_FONTS } from '@/lib/watermark';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET() {
  try {
    const jobs = await db.job.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        cards: { select: { name: true, rawInput: true, status: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    return NextResponse.json({
      ok: true,
      jobs: jobs.map((j) => {
        const done = j.cards.filter((c) => c.status === 'done').length;
        return {
          id: j.id,
          status: j.status,
          currentStage: j.currentStage,
          createdAt: j.createdAt.toISOString(),
          watermarkText: j.watermarkText,
          watermarkMode: j.watermarkMode,
          error: j.error,
          cardsTotal: j.cards.length,
          cardsDone: done,
          samples: j.cards.slice(0, 3).map((c) => c.name || c.rawInput),
        };
      }),
    });
  } catch (e) {
    console.error('GET /api/jobs error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در دریافت تاریخچه' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const inputsRaw = (form.get('inputs') as string) || '[]';
    let lines: string[] = [];
    try {
      const parsed = JSON.parse(inputsRaw);
      lines = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      lines = inputsRaw.split(/\r?\n/).filter(Boolean);
    }

    const files = form.getAll('files').filter((f): f is File => f instanceof File);
    const { seeds: fileSeeds, logoBuf } = await parseFiles(files);

    const textSeeds: SeedProduct[] = parseLines(lines);
    const allSeeds = mergeSeeds(textSeeds, fileSeeds);

    if (!allSeeds.length) {
      return NextResponse.json(
        { ok: false, error: 'هیچ ورودی معتبری یافت نشد — نام محصول، لینک یا فایل ارائه دهید' },
        { status: 400 },
      );
    }
    if (allSeeds.length > 12) {
      return NextResponse.json(
        { ok: false, error: 'حداکثر ۱۲ محصول در هر دور پردازش پشتیبانی می‌شود' },
        { status: 400 },
      );
    }

    const watermarkMode = (form.get('watermarkMode') as string) === 'logo' ? 'logo' : 'text';
    const watermarkText = ((form.get('watermarkText') as string) || '').trim().slice(0, 60);
    const watermarkPosRaw = (form.get('watermarkPos') as string) || 'bottom-right';
    const watermarkPos = watermarkPosRaw === 'repeat-diagonal' ? 'diagonal' : watermarkPosRaw;
    const watermarkLogo = ((form.get('watermarkLogo') as string) || '').slice(0, 2_500_000);
    const watermarkSizeRaw = ((form.get('watermarkSize') as string) || 'medium').trim();
    const watermarkSize = ['small', 'medium', 'large'].includes(watermarkSizeRaw) ? watermarkSizeRaw : 'medium';
    const watermarkFontRaw = ((form.get('watermarkFont') as string) || 'vazirmatn').trim();
    const watermarkFont = watermarkFontRaw in WATERMARK_FONTS ? watermarkFontRaw : 'vazirmatn';
    const cardTheme = getTheme((form.get('cardTheme') as string) || '').key;

    // تنظیمات قیمت‌گذاری سراسری (حاشیه سود + رُند) — خوانده از Setting
    const settingRows = await db.setting.findMany({
      where: { key: { in: ['priceMarkup', 'priceRound'] } },
    });
    const settingMap = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));
    const parsedMarkup = Math.round(Number(settingMap.priceMarkup));
    const priceMarkup = isFinite(parsedMarkup) && parsedMarkup > 0 ? Math.min(90, parsedMarkup) : 0;
    const parsedRound = Math.round(Number(settingMap.priceRound));
    const priceRound = [0, 1000, 5000, 10000].includes(parsedRound) ? parsedRound : 1000;

    const job = await db.job.create({
      data: {
        status: 'pending',
        stagesLog: '[]',
        watermarkMode,
        watermarkText: watermarkText || (watermarkMode === 'logo' ? 'فروشگاه من' : watermarkText),
        watermarkPos,
        watermarkLogo: watermarkMode === 'logo' ? watermarkLogo : '',
        watermarkSize,
        watermarkFont,
        cardTheme,
        priceMarkup,
        priceRound,
        assistantUrl: ((form.get('assistantUrl') as string) || '').slice(0, 500),
        assistantKey: ((form.get('assistantKey') as string) || '').slice(0, 300),
        assistantModel: ((form.get('assistantModel') as string) || '').slice(0, 100),
        useExternal: (form.get('useExternal') as string) === '1',
        cards: {
          create: allSeeds.map((s) => ({
            rawInput: s.rawInput.slice(0, 2000),
            inputType: s.inputType,
            name: (s.name || '').slice(0, 300),
            description: s.description || '',
            usage: s.usage || '',
            priceValue: s.priceValue || 0,
            specs: JSON.stringify(s.specs || []),
            imageUrl: s.imageUrl || '',
            link: s.link || '',
            status: 'pending',
          })),
        },
      },
      include: { cards: true },
    });

    void logoBuf;

    return NextResponse.json({ ok: true, jobId: job.id, cards: job.cards.length });
  } catch (e) {
    console.error('POST /api/jobs error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطای ناشناخته در ساخت پروسه' },
      { status: 500 },
    );
  }
}
