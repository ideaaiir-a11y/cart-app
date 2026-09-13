// اعلان پایان پردازش در ربات بله — خلاصه کارت‌ها برای فروشنده
// شرط ارسال: توکن بله + شناسه چت ثبت‌شده (از پیام کاربر در وب‌هوک) + سوییچ baleNotify
import { db } from '@/lib/db';
import { toFaDigits } from '@/lib/fa';

const BALE_API = 'https://tapi.bale.ai';

export interface JobSummary {
  status: 'done' | 'error';
  durationSec: number;
  watermarkText: string;
  cards: { name: string; price: string; ok: boolean }[];
  origin?: string; // آدرس پایه وب‌اپ برای لینک (اختیاری)
}

export async function getBaleNotifyConfig(): Promise<{
  token: string;
  chatId: string;
  enabled: boolean;
}> {
  const rows = await db.setting.findMany({
    where: { key: { in: ['baleToken', 'baleChatId', 'baleNotify'] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    token: map.baleToken || '',
    chatId: map.baleChatId || '',
    enabled: map.baleNotify === '1',
  };
}

/** ثبت خودکار شناسه چت هنگام اولین پیام کاربر به ربات */
export async function rememberBaleChatId(chatId: string | number): Promise<void> {
  const value = String(chatId);
  const existing = await db.setting.findUnique({ where: { key: 'baleChatId' } });
  if (existing?.value === value) return;
  await db.setting.upsert({
    where: { key: 'baleChatId' },
    update: { value },
    create: { key: 'baleChatId', value },
  });
}

export function buildJobMessage(s: JobSummary): string {
  const lines: string[] = [];
  if (s.status === 'done') {
    lines.push('✅ پردازش شما با موفقیت کامل شد!');
  } else {
    lines.push('⚠️ پردازش با خطا متوقف شد.');
  }
  lines.push(`⏱ مدت: ${toFaDigits(s.durationSec)} ثانیه`);
  if (s.watermarkText) lines.push(`🏷 برند/واترمارک: ${s.watermarkText}`);
  lines.push('');
  if (s.cards.length) {
    lines.push('📦 کارت‌های آماده:');
    for (const c of s.cards.slice(0, 12)) {
      const price = c.price && c.price !== '۰' ? ` — ${c.price}` : '';
      lines.push(`${c.ok ? '🟢' : '🔴'} ${c.name}${price}`);
    }
    const okCount = s.cards.filter((c) => c.ok).length;
    lines.push('');
    lines.push(`مجموع: ${toFaDigits(okCount)} از ${toFaDigits(s.cards.length)} کارت آماده دانلود`);
  }
  if (s.origin) {
    lines.push('');
    lines.push(`🔗 مشاهده و دانلود: ${s.origin}`);
  }
  return lines.join('\n').slice(0, 3800);
}

/** ارسال خلاصه پروسه به چت بله — هرگز خطا پرتاب نمی‌کند (فرایندی جانبی) */
export async function notifyJobDone(jobId: string, summary: JobSummary, origin?: string): Promise<void> {
  try {
    const cfg = await getBaleNotifyConfig();
    if (!cfg.enabled || !cfg.token || !cfg.chatId) return;
    const text = buildJobMessage({ ...summary, origin });
    await fetch(`${BALE_API}/bot${cfg.token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: cfg.chatId, text }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    console.error('bale notify failed:', e);
  }
}
