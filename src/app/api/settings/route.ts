// GET/POST /api/settings — تنظیمات ماندگار کاربر
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const ALLOWED = [
  'watermarkText',
  'watermarkMode',
  'watermarkPos',
  'watermarkSize',
  'watermarkFont',
  'cardTheme',
  'priceMarkup',
  'priceRound',
  'autoReprice',
  'autoRepriceHour',
  'autoRepriceAgeDays',
  'autoRepriceNotify',
  'assistantUrl',
  'assistantKey',
  'assistantModel',
  'useExternal',
  'baleToken',
  'baleNotify',
];

export async function GET() {
  try {
    const rows = await db.setting.findMany({ where: { key: { in: ALLOWED } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({
      ok: true,
      settings: {
        watermarkText: map.watermarkText || '',
        watermarkMode: map.watermarkMode || 'text',
        watermarkPos: map.watermarkPos || 'bottom-right',
        watermarkSize: ['small', 'medium', 'large'].includes(map.watermarkSize) ? map.watermarkSize : 'medium',
        watermarkFont: ['vazirmatn', 'vazirmatn-black', 'lalezar', 'amiri'].includes(map.watermarkFont)
          ? map.watermarkFont
          : 'vazirmatn',
        cardTheme: map.cardTheme || 'emerald',
        priceMarkup: (() => {
          const n = Math.round(Number(map.priceMarkup));
          return isFinite(n) && n > 0 ? Math.min(90, n) : 0;
        })(),
        priceRound: [0, 1000, 5000, 10000].includes(Math.round(Number(map.priceRound)))
          ? Math.round(Number(map.priceRound))
          : 1000,
        autoReprice: map.autoReprice === '1',
        autoRepriceHour: (() => {
          const n = Math.round(Number(map.autoRepriceHour));
          return isFinite(n) && n >= 0 && n <= 23 ? n : 3;
        })(),
        autoRepriceAgeDays: (() => {
          const n = Math.round(Number(map.autoRepriceAgeDays));
          return isFinite(n) && n >= 1 && n <= 90 ? n : 7;
        })(),
        autoRepriceNotify: map.autoRepriceNotify === '1',
        assistantUrl: map.assistantUrl || '',
        assistantKey: map.assistantKey || '',
        assistantModel: map.assistantModel || '',
        useExternal: map.useExternal === '1',
        baleTokenSet: !!map.baleToken,
        baleNotify: map.baleNotify === '1',
        baleChatSet: !!map.baleChatId,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در دریافت تنظیمات' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: { key: string; value: string }[] = [];
    for (const key of ALLOWED) {
      if (key === 'baleToken') continue; // توکن فقط از مسیر بله
      if (key in body) {
        let value = body[key];
        if (typeof value === 'boolean') value = value ? '1' : '0';
        // اعتبارسنجی فیلدهای عددی قیمت‌گذاری
        if (key === 'priceMarkup') {
          const n = Math.round(Number(value));
          value = String(isFinite(n) && n > 0 ? Math.min(90, n) : 0);
        } else if (key === 'priceRound') {
          const n = Math.round(Number(value));
          value = String([0, 1000, 5000, 10000].includes(n) ? n : 1000);
        } else if (key === 'autoRepriceHour') {
          const n = Math.round(Number(value));
          value = String(isFinite(n) && n >= 0 && n <= 23 ? n : 3);
        } else if (key === 'autoRepriceAgeDays') {
          const n = Math.round(Number(value));
          value = String(isFinite(n) && n >= 1 && n <= 90 ? n : 7);
        }
        updates.push({ key, value: String(value ?? '').slice(0, 2000) });
      }
    }
    for (const u of updates) {
      await db.setting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      });
    }
    return NextResponse.json({ ok: true, saved: updates.length });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در ذخیره تنظیمات' },
      { status: 500 },
    );
  }
}
