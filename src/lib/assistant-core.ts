// هسته مشترک چت‌بات ویرایشگر — استفاده در /api/assistant/chat و /api/v1/chat
import { db } from '@/lib/db';
import { zai, parseJsonLoose } from '@/lib/ai';
import { callExternal } from '@/lib/external-llm';
import { buildProductHtml } from '@/lib/card-template';
import { extractPriceCandidates, formatToman, toEnDigits, sanitizeFaText, sanitizeSpecs } from '@/lib/fa';
import { pushPriceHistory } from '@/lib/reprice';
import { SpecItem, AssistantEdit } from '@/lib/types';

export const SYSTEM_BASE = `تو «دستیار ویرایشگر کارت محصول» هستی؛ متخصص فروشگاه‌های اینترنتی فارسی‌زبان.
کاربر ممکن است بخواهد نام، توضیحات، روش مصرف، قیمت یا جدول مشخصات کارت را تغییر دهد.
قواعد:
1) همیشه فارسی روان و حرفه‌ای پاسخ بده.
2) اگر کاربر تغییری در کارت خواست، در پایان پاسخ یک بلوک JSON با خط دقیق __EDITS__ بده:
__EDITS__
{"name":"عنوان جدید (اختیاری)","description":"توضیح جدید (اختیاری)","usage":"روش مصرف جدید (اختیاری)","price":"قیمت مثل ۳۵۰,۰۰۰ تومان (اختیاری)","specs":[{"key":"برند","value":"…"}] (اختیاری)}
3) اگر تغییری لازم نیست، بلوک JSON نده.
4) قیمت پیشنهادی را با استدلال کوتاه درباره بازار ایران توجیه کن.
5) پاسخ کوتاه و کاربردی باشد (حداکثر ۱۲۰ کلمه).`;

export interface CardLike {
  id: string;
  name: string;
  description: string;
  usage: string;
  price: string;
  priceValue: number;
  priceHistory: string;
  specs: string;
  imageUrl: string;
  link: string;
  rawInput: string;
  job: { watermarkText: string };
}

export function cardContext(c: CardLike): string {
  let specs: SpecItem[] = [];
  try {
    specs = JSON.parse(c.specs || '[]');
  } catch {
    /* ignore */
  }
  return [
    `عنوان فعلی: ${c.name || c.rawInput || '—'}`,
    `قیمت فعلی: ${c.price || 'ثبت نشده'}`,
    `توضیحات فعلی: ${c.description || '—'}`,
    `روش مصرف فعلی: ${c.usage || '—'}`,
    `مشخصات فعلی: ${JSON.stringify(specs)}`,
  ].join('\n');
}

export interface AssistantChatPayload {
  sessionId?: string;
  cardId?: string;
  message?: string;
}

export interface AssistantChatResult {
  ok: boolean;
  reply: string;
  applied: boolean;
  via: string;
  card?: Record<string, unknown> | null;
  error?: string;
  status?: number;
}

export async function runAssistantChat(body: AssistantChatPayload): Promise<AssistantChatResult> {
  const message = (body.message || '').trim().slice(0, 2000);
  const sessionId = body.sessionId || 'default';
  if (!message) {
    return { ok: false, reply: '', applied: false, via: '', error: 'پیام خالی است', status: 400 };
  }

  // تنظیمات دستیار خارجی
  const settingKeys = ['useExternal', 'assistantUrl', 'assistantKey', 'assistantModel'];
  const settings = await db.setting.findMany({ where: { key: { in: settingKeys } } });
  const sMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const useExternal = sMap.useExternal === '1' && !!sMap.assistantUrl;

  // کارت زمینه
  let card: CardLike | null = null;
  if (body.cardId) {
    const c = await db.card.findUnique({
      where: { id: body.cardId },
      include: { job: { select: { watermarkText: true } } },
    });
    if (c) card = c;
  }

  // تاریخچه گفتگو
  const history = await db.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  await db.chatMessage.create({
    data: { sessionId, cardId: body.cardId || '', role: 'user', content: message },
  });

  const sys = card ? `${SYSTEM_BASE}\n\nزمینه کارت انتخاب‌شده:\n${cardContext(card)}` : SYSTEM_BASE;
  const messages = [
    { role: 'assistant', content: sys },
    ...history.map((h) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
    { role: 'user', content: message },
  ];

  let reply = '';
  let via = 'داخلی';
  try {
    if (useExternal) {
      reply = await callExternal(sMap.assistantUrl, sMap.assistantKey || '', sMap.assistantModel || '', messages);
      via = 'خارجی';
    } else {
      const client = await zai();
      const completion = await client.chat.completions.create({
        messages: messages as never,
        thinking: { type: 'disabled' },
      });
      reply = completion.choices[0]?.message?.content || '';
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطای دستیار';
    return {
      ok: false,
      reply: '',
      applied: false,
      via,
      error: useExternal ? `دستیار خارجی در دسترس نیست: ${msg}` : `دستیار داخلی خطا داد: ${msg}`,
      status: 502,
    };
  }

  // استخراج و اعمال ویرایش‌ها (بلوک __EDITS__ همیشه از پاسخ نمایشی حذف می‌شود)
  let applied = false;
  let updatedCard: Record<string, unknown> | null = null;
  const editMatch = reply.split('__EDITS__')[1];
  if (editMatch) {
    reply = reply.split('__EDITS__')[0].trim();
  }
  if (editMatch && card) {
    const edits = parseJsonLoose<AssistantEdit>(editMatch);
    if (edits) {
      const data: Record<string, string | number> = {};
      if (edits.name?.trim()) data.name = sanitizeFaText(edits.name).slice(0, 300);
      if (edits.description?.trim()) data.description = sanitizeFaText(edits.description).slice(0, 4000);
      if (edits.usage?.trim()) data.usage = sanitizeFaText(edits.usage).slice(0, 2000);
      let priceValue = card.priceValue;
      if (edits.price?.trim()) {
        const nums = extractPriceCandidates(toEnDigits(edits.price));
        if (nums.length) {
          priceValue = nums.sort((a, b) => a - b)[Math.floor(nums.length / 2)];
          data.price = formatToman(priceValue);
          data.priceValue = priceValue;
          if (priceValue > 0 && priceValue !== card.priceValue) {
            data.priceHistory = JSON.stringify(
              pushPriceHistory(card.priceHistory, priceValue, 'assistant'),
            );
          }
        }
      }
      if (Array.isArray(edits.specs) && edits.specs.length) {
        const clean = sanitizeSpecs(
          edits.specs
            .filter((s) => s?.key?.trim() && s?.value?.trim())
            .slice(0, 16),
        ).map((s) => ({ key: s.key.slice(0, 80), value: s.value.slice(0, 200) }));
        data.specs = JSON.stringify(clean);
      }
      if (Object.keys(data).length) {
        const updated = await db.card.update({ where: { id: card.id }, data });
        let specs: SpecItem[] = [];
        try {
          specs = JSON.parse(updated.specs || '[]');
        } catch {
          /* ignore */
        }
        const html = buildProductHtml({
          title: updated.name || updated.rawInput || 'محصول',
          description: updated.description,
          price: updated.price,
          imageUrl: updated.imageUrl,
          specs,
          usage: updated.usage,
          link: updated.link,
          brand: card.job.watermarkText,
        });
        const final = await db.card.update({ where: { id: card.id }, data: { html } });
        applied = true;
        updatedCard = {
          id: final.id,
          name: final.name,
          description: final.description,
          usage: final.usage,
          price: final.price,
          priceValue: final.priceValue,
          specs,
          imageUrl: final.imageUrl,
          link: final.link,
          html: final.html,
          status: final.status,
        };
      }
    }
  }

  await db.chatMessage.create({
    data: { sessionId, cardId: body.cardId || '', role: 'assistant', content: reply },
  });

  return { ok: true, reply, applied, via, card: updatedCard };
}
