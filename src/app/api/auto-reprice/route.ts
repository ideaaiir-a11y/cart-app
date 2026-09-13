// GET  /api/auto-reprice — وضعیت زمان‌بند خودکار قیمت (تنظیمات + آخرین اجرا + شمار واجدان شرط)
// POST /api/auto-reprice — اجرای فوری در پس‌زمینه {action:"run"}
import { NextRequest, NextResponse } from 'next/server';
import {
  getAutoRepriceConfig,
  countEligibleCards,
  runAutoRepriceOnce,
} from '@/lib/auto-reprice';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cfg = await getAutoRepriceConfig();
    const eligible = cfg.enabled ? await countEligibleCards(cfg.ageDays) : 0;

    // تخمین اجرای بعدی: امروز ساعت تنظیم‌شده، اگر گذشته/اجرا شده باشد فردا
    const now = new Date();
    let nextRun = new Date(now);
    nextRun.setHours(cfg.hour, 5, 0, 0);
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (nextRun <= now || cfg.lastDate === todayKey) {
      nextRun = new Date(nextRun.getTime() + 24 * 60 * 60 * 1000);
    }

    return NextResponse.json({
      ok: true,
      status: {
        enabled: cfg.enabled,
        hour: cfg.hour,
        ageDays: cfg.ageDays,
        notify: cfg.notify,
        lastDate: cfg.lastDate,
        lastResult: cfg.lastResult,
        eligible,
        nextRunAt: nextRun.toISOString(),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در دریافت وضعیت' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action !== 'run') {
      return NextResponse.json({ ok: false, error: 'action نامعتبر است' }, { status: 400 });
    }
    // اجرا در پس‌زمینه — نتیجه از GET وضعیت خوانده می‌شود
    void runAutoRepriceOnce('manual').catch((e) =>
      console.error('[auto-reprice] manual run error:', e),
    );
    return NextResponse.json({ ok: true, started: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در اجرای دستی' },
      { status: 500 },
    );
  }
}
