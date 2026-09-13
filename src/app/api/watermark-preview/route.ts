// GET /api/watermark-preview — پیش‌نمایش زنده واترمارک روی تصویر نمونه
// پارامترها: text، pos، size (small|medium|large)، font (کلید قلم)
// خروجی: PNG با کش سمت مرورگر (تغییر بر اساس پارامترها)
import { NextRequest, NextResponse } from 'next/server';
import { applyWatermark, sampleImage, WatermarkPos, WATERMARK_SCALES, WATERMARK_FONTS } from '@/lib/watermark';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const text = (sp.get('text') || 'فروشگاه نمونه').trim().slice(0, 40) || 'فروشگاه نمونه';
    const posRaw = (sp.get('pos') || 'bottom-right').trim();
    const pos = (
      ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center', 'diagonal'].includes(posRaw)
        ? posRaw
        : 'bottom-right'
    ) as WatermarkPos;
    const sizeRaw = (sp.get('size') || 'medium').trim();
    const scale = WATERMARK_SCALES[sizeRaw] ?? 1;
    const fontRaw = (sp.get('font') || 'vazirmatn').trim();
    const font = fontRaw in WATERMARK_FONTS ? fontRaw : 'vazirmatn';

    const base = await sampleImage();
    const out = await applyWatermark(base, { mode: 'text', text, pos, scale, font });

    return new NextResponse(new Uint8Array(out.buf), {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('watermark preview error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در ساخت پیش‌نمایش' },
      { status: 500 },
    );
  }
}
