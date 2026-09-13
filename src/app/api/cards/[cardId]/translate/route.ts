// POST /api/cards/[cardId]/translate — ساخت نسخه انگلیسی کارت (ترجمه + رندر چپ‌به‌راست)
// خروجی: descriptionEn/usageEn/specsEn/nameEn ذخیره و htmlEn رندر می‌شود
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { zai, parseJsonLoose } from '@/lib/ai';
import { buildProductHtml } from '@/lib/card-template';
import { SpecItem } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await ctx.params;
    const card = await db.card.findUnique({ where: { id: cardId }, include: { job: true } });
    if (!card) return NextResponse.json({ ok: false, error: 'کارت یافت نشد' }, { status: 404 });
    if (!card.description && !card.name && !card.rawInput) {
      return NextResponse.json({ ok: false, error: 'این کارت محتوایی برای ترجمه ندارد' }, { status: 400 });
    }

    let specs: SpecItem[] = [];
    try {
      specs = JSON.parse(card.specs || '[]');
    } catch { /* ignore */ }

    const system = `You are a professional e-commerce product copywriter. Translate Persian product card content into natural, persuasive ENGLISH for an international marketplace.
Output ONLY valid JSON with this exact structure:
{"title":"English product title (Brand + Type + Model)","description":"3-4 sentence engaging English description","usage":"Short step-by-step how-to-use instructions","specs":[{"key":"Key","value":"Value"}]}
Rules:
- Translate ALL ${specs.length} spec rows; keep keys/values concise English.
- Do not add CJK/Chinese characters or any non-Latin scripts.
- Prices and numbers: plain Latin digits without separators.
- Keep tone professional and sales-oriented.`;

    const user = [
      `Persian title: ${card.name || card.rawInput}`,
      card.nameFa ? `Persian name: ${card.nameFa}` : '',
      card.description ? `Persian description: ${card.description}` : '',
      card.usage ? `Persian usage: ${card.usage}` : '',
      specs.length ? `Persian specs: ${JSON.stringify(specs)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const client = await zai();
    const raw = await client.chat.completions.create({
      messages: [
        { role: 'assistant', content: system },
        { role: 'user', content: user },
      ],
      thinking: { type: 'disabled' },
    });

    const parsed = parseJsonLoose<{
      title: string;
      description: string;
      usage?: string;
      specs?: SpecItem[];
    }>(raw.choices[0]?.message?.content || '');

    if (!parsed?.description) {
      return NextResponse.json(
        { ok: false, error: 'پاسخ مدل نامعتبر بود؛ ترجمه انجام نشد' },
        { status: 502 },
      );
    }

    // پاک‌سازی نویسه‌های غیرلاتین از خروجی انگلیسی
    const nonLatin = /[^\x00-\u024F\u200e\u200f\s]/g;
    const cleanEn = (s: string) => (s || '').replace(nonLatin, ' ').replace(/\s{2,}/g, ' ').trim();
    const enTitle = cleanEn(parsed.title) || card.nameEn || 'Product';
    const enDescription = cleanEn(parsed.description);
    const enUsage = cleanEn(parsed.usage || '');
    const enSpecs = Array.isArray(parsed.specs)
      ? parsed.specs
          .map((s) => ({ key: cleanEn(String(s?.key || '')), value: cleanEn(String(s?.value || '')) }))
          .filter((s) => s.key && s.value)
          .slice(0, 16)
      : [];

    // قیمت انگلیسی: ارقام لاتین + Toman
    const priceEn = card.priceValue > 0 ? `${card.priceValue.toLocaleString('en-US')} Toman` : '';

    const htmlEn = buildProductHtml({
      title: enTitle,
      description: enDescription,
      price: priceEn,
      imageUrl: card.imageUrl,
      specs: enSpecs,
      usage: enUsage,
      link: card.link,
      brand: card.job.watermarkText,
      theme: card.theme || card.job.cardTheme,
      lang: 'en',
    });

    const final = await db.card.update({
      where: { id: cardId },
      data: {
        nameEn: card.nameEn || enTitle,
        descriptionEn: enDescription,
        usageEn: enUsage,
        specsEn: JSON.stringify(enSpecs),
        htmlEn,
      },
    });

    return NextResponse.json({
      ok: true,
      card: {
        id: final.id,
        nameEn: final.nameEn,
        descriptionEn: final.descriptionEn,
        usageEn: final.usageEn,
        specsEn: enSpecs,
        htmlEn: final.htmlEn,
      },
    });
  } catch (e) {
    console.error('translate error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطا در ساخت نسخه انگلیسی' },
      { status: 500 },
    );
  }
}
