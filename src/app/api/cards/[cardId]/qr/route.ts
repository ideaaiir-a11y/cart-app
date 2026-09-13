// GET /api/cards/[cardId]/qr — تصویر QR کد لینک اشتراک‌گذاری کارت (PNG)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import QRCode from 'qrcode';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await ctx.params;
    const card = await db.card.findUnique({ where: { id: cardId }, select: { id: true } });
    if (!card) {
      return NextResponse.json({ ok: false, error: 'کارت یافت نشد' }, { status: 404 });
    }

    // ساخت آدرس مطلق صفحه اشتراک از هدرهای درخواست
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    const shareUrl = `${proto}://${host}/api/cards/${cardId}/share`;

    const png = await QRCode.toBuffer(shareUrl, {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#064e3b', light: '#ffffff' },
    });

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=3600',
        'x-share-url': shareUrl,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در ساخت QR' },
      { status: 500 },
    );
  }
}
