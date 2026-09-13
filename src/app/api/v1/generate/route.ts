// POST /api/v1/generate — ساخت پروسه جدید و اجرای پایپ‌لاین (وب‌سرویس عمومی با کلید)
// بدنه JSON: { input: string | string[], watermarkText?, watermarkMode?, watermarkPos?, watermarkSize?, watermarkFont?, cardTheme? }
// پاسخ: { ok, jobId, cards, poll }
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, v1Error, V1_CORS_HEADERS } from '@/lib/api-auth';
import { parseLines, mergeSeeds, SeedProduct } from '@/lib/parse-input';
import { getTheme } from '@/lib/card-themes';
import { WATERMARK_FONTS } from '@/lib/watermark';
import { runPipeline } from '@/lib/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 300;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: V1_CORS_HEADERS });
}

const VALID_POSITIONS = [
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
  'center',
  'diagonal',
];

export async function POST(req: NextRequest) {
  const auth = await checkApiAuth(req);
  if (!auth.ok) return v1Error(auth.error, auth.status);
  try {
    const body = (await req.json().catch(() => ({}))) as {
      input?: string | string[];
      watermarkText?: string;
      watermarkMode?: string;
      watermarkPos?: string;
      watermarkSize?: string;
      watermarkFont?: string;
      cardTheme?: string;
    };

    const rawInput = Array.isArray(body.input) ? body.input : body.input ? [body.input] : [];
    const lines = rawInput.map((s) => String(s)).filter((s) => s.trim());
    const seeds: SeedProduct[] = parseLines(lines);
    const allSeeds = mergeSeeds(seeds, []);
    if (!allSeeds.length) {
      return v1Error('ورودی نامعتبر است — نام محصول یا لینک بفرستید (فیلد input)', 400);
    }
    if (allSeeds.length > 12) {
      return v1Error('حداکثر ۱۲ محصول در هر درخواست پشتیبانی می‌شود', 400);
    }

    const watermarkMode = body.watermarkMode === 'logo' ? 'logo' : 'text';
    const watermarkText = String(body.watermarkText || '').trim().slice(0, 60);
    const posRaw = String(body.watermarkPos || 'bottom-right');
    const watermarkPos = VALID_POSITIONS.includes(posRaw) ? posRaw : 'bottom-right';
    const sizeRaw = String(body.watermarkSize || 'medium').trim();
    const watermarkSize = ['small', 'medium', 'large'].includes(sizeRaw) ? sizeRaw : 'medium';
    const fontRaw = String(body.watermarkFont || 'vazirmatn').trim();
    const watermarkFont = fontRaw in WATERMARK_FONTS ? fontRaw : 'vazirmatn';
    const cardTheme = getTheme(String(body.cardTheme || '')).key;

    // تنظیمات قیمت‌گذاری سراسری (مانند POST /api/jobs)
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
        watermarkSize,
        watermarkFont,
        cardTheme,
        priceMarkup,
        priceRound,
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

    // اجرای پس‌زمینه (سرور ماندگار است)
    void runPipeline(job.id);

    return Response.json(
      {
        ok: true,
        jobId: job.id,
        cards: job.cards.length,
        poll: `/api/v1/jobs/${job.id}`,
      },
      { headers: V1_CORS_HEADERS },
    );
  } catch (e) {
    return v1Error(e instanceof Error ? e.message : 'خطا در ساخت پروسه', 500);
  }
}
