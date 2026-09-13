// GET  /api/apikey — دریافت کلید عمومی (در صورت نبود، خودکار ساخته می‌شود)
// POST /api/apikey — بازتولید کلید (کلید قبلی باطل می‌شود)
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureApiKey, generateApiKey, maskApiKey } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const apiKey = await ensureApiKey();
    return NextResponse.json({ ok: true, apiKey, masked: maskApiKey(apiKey) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در دریافت کلید' },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const apiKey = generateApiKey();
    await db.setting.upsert({
      where: { key: 'apiKey' },
      update: { value: apiKey },
      create: { key: 'apiKey', value: apiKey },
    });
    return NextResponse.json({ ok: true, apiKey, masked: maskApiKey(apiKey) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در بازتولید کلید' },
      { status: 500 },
    );
  }
}
