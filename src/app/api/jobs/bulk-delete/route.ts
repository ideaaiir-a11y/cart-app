// POST /api/jobs/bulk-delete — حذف گروهی پروسه‌ها (کارت‌ها با Cascade حذف می‌شوند)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
    const ids = Array.isArray(body?.ids)
      ? (body!.ids as unknown[]).filter((v): v is string => typeof v === 'string' && v.length > 0)
      : [];
    if (!ids.length) {
      return NextResponse.json({ ok: false, error: 'هیچ پروسه‌ای انتخاب نشده است' }, { status: 400 });
    }
    const result = await db.job.deleteMany({
      where: { id: { in: ids.slice(0, 100) } },
    });
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در حذف گروهی' },
      { status: 500 },
    );
  }
}
