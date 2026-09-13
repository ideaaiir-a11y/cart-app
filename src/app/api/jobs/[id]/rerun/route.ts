// POST /api/jobs/[id]/rerun — اجرای مجدد کامل پروسه (ریست مراحل + اجرای پایپ‌لاین از نو)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runPipeline } from '@/lib/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const job = await db.job.findUnique({ where: { id }, include: { cards: true } });
    if (!job) {
      return NextResponse.json({ ok: false, error: 'پروسه یافت نشد' }, { status: 404 });
    }
    if (job.status === 'running') {
      return NextResponse.json({ ok: false, error: 'این پروسه هم‌اکنون در حال اجراست' }, { status: 409 });
    }
    if (job.cards.length === 0) {
      return NextResponse.json({ ok: false, error: 'این پروسه محصولی برای اجرای مجدد ندارد' }, { status: 400 });
    }

    // ریست کامل وضعیت: مراحل خالی، کارت‌ها به انتظار، خطا پاک
    await db.job.update({
      where: { id },
      data: { status: 'pending', currentStage: '', stagesLog: '[]', error: '' },
    });
    await db.card.updateMany({ where: { jobId: id }, data: { status: 'pending', error: '' } });

    // اجرای پس‌زمینه — داده‌های قبلی کارت‌ها به‌عنوان سرنخ حفظ می‌شوند
    void runPipeline(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('rerun error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در اجرای مجدد' },
      { status: 500 },
    );
  }
}
