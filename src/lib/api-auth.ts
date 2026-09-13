// ─────────────────────────────────────────────────────────────
// زیرساخت کلید API عمومی (sk-ph-...) برای «دریافت درخواست‌ها» از
// دستیارهای خارجی و برنامه‌های دیگر — نسخه ۱ وب‌سرویس (/api/v1)
// ─────────────────────────────────────────────────────────────
import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';

const API_KEY_SETTING = 'apiKey';

/** ساخت کلید جدید با قالب sk-ph-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx */
export function generateApiKey(): string {
  return `sk-ph-${randomBytes(16).toString('hex')}`;
}

/** خواندن کلید موجود یا ساخت خودکار در اولین نیاز */
export async function ensureApiKey(): Promise<string> {
  const row = await db.setting.findUnique({ where: { key: API_KEY_SETTING } });
  if (row?.value) return row.value;
  const key = generateApiKey();
  await db.setting.upsert({
    where: { key: API_KEY_SETTING },
    update: { value: key },
    create: { key: API_KEY_SETTING, value: key },
  });
  return key;
}

/** کلید درست است؟ (بدون ساخت) */
async function keyMatches(provided: string): Promise<boolean> {
  const row = await db.setting.findUnique({ where: { key: API_KEY_SETTING } });
  return !!row?.value && provided === row.value;
}

export interface ApiAuthResult {
  ok: boolean;
  status: number;
  error: string;
}

/**
 * اعتبارسنجی کلید از سه مسیر:
 * 1) هدر Authorization: Bearer sk-ph-…
 * 2) هدر x-api-key
 * 3) پارامتر آدرس ?apiKey= (برای جاسازی ساده در URL)
 */
export async function checkApiAuth(req: NextRequest): Promise<ApiAuthResult> {
  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const xKey = req.headers.get('x-api-key')?.trim() || '';
  let queryKey = '';
  try {
    queryKey = new URL(req.url).searchParams.get('apiKey')?.trim() || '';
  } catch {
    queryKey = '';
  }
  const provided = bearer || xKey || queryKey;
  if (!provided) {
    return {
      ok: false,
      status: 401,
      error:
        'کلید API ارائه نشده است — کلید را در هدر Authorization: Bearer یا پارامتر ?apiKey= بفرستید',
    };
  }
  const ok = await keyMatches(provided);
  if (!ok) {
    return { ok: false, status: 401, error: 'کلید API نامعتبر است' };
  }
  return { ok: true, status: 200, error: '' };
}

/** پوشاندن کلید برای نمایش امن: sk-ph-f7****4fab */
export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return `${key.slice(0, 4)}****`;
  return `${key.slice(0, 8)}****${key.slice(-4)}`;
}

/** هدرهای CORS برای فراخوانی از سایت‌های خارجی */
export const V1_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Access-Control-Max-Age': '86400',
};

/** پاسخ استاندارد خطا برای وب‌سرویس عمومی */
export function v1Error(error: string, status = 400) {
  return Response.json({ ok: false, error }, { status, headers: V1_CORS_HEADERS });
}
