// POST /api/bale/setup — ثبت توکن ربات بله + ثبت وب‌هوک + تست اتصال (getMe)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BALE_API = 'https://tapi.bale.ai';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { token?: string };
    const token = (body.token || '').trim();
    if (!token || token.length < 20) {
      return NextResponse.json(
        { ok: false, error: 'توکن ربات معتبر نیست — توکن را از @BotFather بله دریافت کنید' },
        { status: 400 },
      );
    }

    // ۱) تست اتصال
    const meRes = await fetch(`${BALE_API}/bot${token}/getMe`, { signal: AbortSignal.timeout(15_000) });
    if (!meRes.ok) {
      return NextResponse.json(
        { ok: false, error: `اتصال ناموفق (کد ${meRes.status}) — توکن را بررسی کنید` },
        { status: 400 },
      );
    }
    const me = (await meRes.json()) as {
      ok?: boolean;
      result?: { id?: number; username?: string; first_name?: string };
    };
    if (!me.ok || !me.result) {
      return NextResponse.json(
        { ok: false, error: 'توکن پذیرفته نشد (پاسخ نامعتبر از سرور بله)' },
        { status: 400 },
      );
    }

    // ۲) ثبت وب‌هوک (پایه فعلی درخواست — در صورت داخلی بودن شبکه، خطای وب‌هوک نادیده گرفته می‌شود)
    let webhookOk = false;
    let webhookMsg = '';
    try {
      const origin = req.headers.get('origin') || req.headers.get('referer') || '';
      const base = origin ? new URL(origin).origin : '';
      if (base && /^https:\/\//.test(base)) {
        const hookRes = await fetch(`${BALE_API}/bot${token}/setWebhook`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: `${base}/api/bale/hook` }),
          signal: AbortSignal.timeout(15_000),
        });
        webhookOk = hookRes.ok;
        webhookMsg = webhookOk ? 'وب‌هوک ثبت شد' : `ثبت وب‌هوک ناموفق (کد ${hookRes.status})`;
      } else {
        webhookMsg = 'برای ثبت وب‌هوک، اپ باید روی دامنه HTTPS عمومی در دسترس باشد';
      }
    } catch (e) {
      webhookMsg = `ثبت وب‌هوک ناموفق: ${e instanceof Error ? e.message : 'خطا'}`;
    }

    // ۳) ذخیره توکن
    await db.setting.upsert({
      where: { key: 'baleToken' },
      update: { value: token },
      create: { key: 'baleToken', value: token },
    });
    await db.setting.upsert({
      where: { key: 'baleLastInfo' },
      update: { value: JSON.stringify(me.result) },
      create: { key: 'baleLastInfo', value: JSON.stringify(me.result) },
    });

    return NextResponse.json({
      ok: true,
      info: {
        username: me.result.username || '',
        name: me.result.first_name || '',
        id: me.result.id || 0,
      },
      webhookOk,
      webhookMsg,
    });
  } catch (e) {
    console.error('bale setup error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در اتصال به بله' },
      { status: 500 },
    );
  }
}
