// GET /api/bale/status — وضعیت اتصال ربات بله
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rows = await db.setting.findMany({
      where: { key: { in: ['baleToken', 'baleLastInfo', 'baleChatId', 'baleNotify'] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    let info: unknown = null;
    try {
      info = map.baleLastInfo ? JSON.parse(map.baleLastInfo) : null;
    } catch { /* ignore */ }
    return NextResponse.json({
      ok: true,
      tokenSet: !!map.baleToken,
      lastInfo: info,
      chatSet: !!map.baleChatId,
      notify: map.baleNotify === '1',
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا' },
      { status: 500 },
    );
  }
}
