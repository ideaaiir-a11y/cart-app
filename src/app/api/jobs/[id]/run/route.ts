// POST /api/jobs/[id]/run — شروع اجرای پایپ‌لاین در پس‌زمینه
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runPipeline } from '@/lib/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const job = await db.job.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ ok: false, error: 'پروسه یافت نشد' }, { status: 404 });
    }
    if (job.status === 'running') {
      return NextResponse.json({ ok: true, message: 'در حال اجراست' });
    }
    // اجرای پس‌زمینه — سرور ماندگار است و ادامه می‌یابد
    void runPipeline(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('run error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در شروع پروسه' },
      { status: 500 },
    );
  }
}
