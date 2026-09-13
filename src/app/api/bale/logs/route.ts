// GET /api/bale/logs — آخرین پیام‌های ربات بله (ورودی/خروجی)
// DELETE /api/bale/logs — پاک کردن لاگ‌ها
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const limitRaw = Number(new URL(req.url).searchParams.get('limit') || '30');
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const logs = await db.baleLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return NextResponse.json({ ok: true, logs });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در دریافت لاگ' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    await db.baleLog.deleteMany({});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در پاک کردن لاگ' },
      { status: 500 },
    );
  }
}
