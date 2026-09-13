// GET /api/jobs/[id]/download/[cardId] — فایل HTML تکی کارت (?format=json → خروجی JSON ساختاریافته | ?lang=en → نسخه انگلیسی)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cardFileName } from '@/lib/card-template';
import { buildCardJson } from '@/lib/card-json';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; cardId: string }> }) {
  try {
    const { cardId } = await ctx.params;
    const format = req.nextUrl.searchParams.get('format') || 'html';
    const lang = req.nextUrl.searchParams.get('lang') || 'fa';
    const card = await db.card.findUnique({ where: { id: cardId }, include: { job: true } });
    if (!card || !card.html) {
      return NextResponse.json({ ok: false, error: 'کارت یافت نشد' }, { status: 404 });
    }
    const name = cardFileName(card.name || card.rawInput || 'product', card.id);

    if (format === 'json') {
      const json = buildCardJson(card, card.job.watermarkText, card.job.cardTheme, name);
      return new NextResponse(JSON.stringify(json, null, 2), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name.replace(/\.html$/, '.json'))}`,
          'cache-control': 'no-store',
        },
      });
    }

    // نسخه انگلیسی — نیازمند ترجمه قبلی
    if (lang === 'en') {
      if (!card.htmlEn) {
        return NextResponse.json(
          { ok: false, error: 'نسخه انگلیسی این کارت هنوز ساخته نشده است؛ ابتدا دکمه «نسخه EN» را بزنید' },
          { status: 409 },
        );
      }
      const nameEn = name.replace(/\.html$/, '-en.html');
      return new NextResponse(card.htmlEn, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(nameEn)}`,
          'cache-control': 'no-store',
        },
      });
    }

    return new NextResponse(card.html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        'cache-control': 'no-store',
      },
    });
  } catch (e) {
    console.error('card download error:', e);
    return NextResponse.json({ ok: false, error: 'خطا در دانلود کارت' }, { status: 500 });
  }
}
