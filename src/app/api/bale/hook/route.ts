// POST /api/bale/hook — دریافت آپدیت‌های ربات بله و پاسخ با دستیار هوشمند
// این مسیر توسط سرورهای بله فراخوانی می‌شود (setWebhook → {origin}/api/bale/hook)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { zai } from '@/lib/ai';
import { rememberBaleChatId } from '@/lib/bale-notify';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BALE_API = 'https://tapi.bale.ai';

const BOT_SYSTEM = `تو دستیار فروشگاهی «کارت‌ساز هوشمند محصول» در پیام‌رسان بله هستی.
به فارسی روان، کوتاه و محترمانه پاسخ بده. به کاربر کمک کن درباره ساخت و ویرایش کارت محصول، قیمت‌گذاری، واترمارک و خروجی HTML/ZIP.
اگر پرسید چطور کارت بسازد، این مسیر را توضیح بده:
۱) در وب‌اپ، نام محصول یا لینک را وارد کن ۲) واترمارک/برند را تنظیم کن ۳) دکمه «شروع پردازش» را بزن ۴) پس از ۶ مرحله خودکار، کارت HTML و ZIP را دانلود کن.
پیام‌های طولانی نفرست (حداکثر ۱۵۰ کلمه).`;

async function sendMessage(token: string, chatId: string | number, text: string): Promise<void> {
  let ok = true;
  let error = '';
  try {
    const res = await fetch(`${BALE_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3800) }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    ok = res.ok && data.ok !== false;
    error = data.description || (res.ok ? '' : `HTTP ${res.status}`);
  } catch (e) {
    ok = false;
    error = e instanceof Error ? e.message : String(e);
    console.error('bale sendMessage failed:', e);
  }
  // ثبت پیام خروجی در لاگ (جانبی و بی‌خطر)
  db.baleLog
    .create({
      data: { direction: 'out', chatId: String(chatId), userName: 'ربات', text: text.slice(0, 500), ok, error },
    })
    .catch(() => {});
}

export async function POST(req: NextRequest) {
  try {
    const update = (await req.json().catch(() => null)) as
      | {
          message?: {
            chat?: { id?: string | number };
            text?: string;
            from?: { first_name?: string; last_name?: string; username?: string };
          };
          edited_message?: {
            chat?: { id?: string | number };
            text?: string;
            from?: { first_name?: string; last_name?: string; username?: string };
          };
        }
      | null;

    interface BaleUser {
      first_name?: string;
      last_name?: string;
      username?: string;
    }

    const msg = update?.message || update?.edited_message;
    const chatId = msg?.chat?.id;
    const text = (msg?.text || '').trim();
    const from: BaleUser | undefined = msg?.from;
    const userName =
      [from?.first_name, from?.last_name].filter(Boolean).join(' ') || from?.username || '';

    // همیشه 200 برگردانید تا بله پیام را retry نکند
    if (!chatId || !text) return NextResponse.json({ ok: true });

    const tokenRow = await db.setting.findUnique({ where: { key: 'baleToken' } });
    if (!tokenRow?.value) return NextResponse.json({ ok: true });

    // ثبت شناسه چت برای اعلان‌های پایان پردازش (ساده و بی‌صدا)
    await rememberBaleChatId(chatId).catch(() => {});

    // ثبت پیام ورودی در لاگ
    await db.baleLog
      .create({
        data: { direction: 'in', chatId: String(chatId), userName, text: text.slice(0, 500), ok: true },
      })
      .catch(() => {});

    // /start
    if (text === '/start' || text === '/help') {
      await sendMessage(
        tokenRow.value,
        chatId,
        [
          'سلام! 👋 به دستیار «کارت‌ساز هوشمند محصول» خوش آمدید.',
          '',
          'من می‌توانم درباره این موارد راهنمایی کنم:',
          '• ساخت خودکار کارت محصول (نام، قیمت، تصویر، واترمارک)',
          '• قیمت‌گذاری بر اساس سایت‌های همکار',
          '• ویرایش حرفه‌ای توضیحات و مشخصات',
          '• خروجی HTML تکی و ZIP گروهی',
          '',
          'برای ساخت کارت، به وب‌اپ بروید و «شروع پردازش» را بزنید. اینجا هم هر سوالی دارید بپرسید!',
        ].join('\n'),
      );
      return NextResponse.json({ ok: true });
    }

    // پاسخ هوشمند
    try {
      const client = await zai();
      const completion = await client.chat.completions.create({
        messages: [
          { role: 'assistant', content: BOT_SYSTEM },
          { role: 'user', content: text },
        ],
        thinking: { type: 'disabled' },
      });
      const reply = completion.choices[0]?.message?.content || 'متوجه نشدم؛ لطفاً سوال را واضح‌تر بپرسید.';
      await sendMessage(tokenRow.value, chatId, reply);
    } catch (e) {
      console.error('bale llm failed:', e);
      await sendMessage(tokenRow.value, chatId, 'فعلاً نمی‌توانم پاسخ بدهم؛ کمی بعد دوباره تلاش کنید.');
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('bale hook error:', e);
    return NextResponse.json({ ok: true });
  }
}
