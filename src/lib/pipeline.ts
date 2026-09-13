// ─────────────────────────────────────────────────────────────
// موتور پروسه ۶ مرحله‌ای ساخت کارت محصول
// نام‌گذاری ← قیمت‌گذاری ← تصاویر و واترمارک ← راستی‌آزمایی ← بهینه‌سازی ← ساخت کارت
// ─────────────────────────────────────────────────────────────
import { db } from '@/lib/db';
import { STAGE_DEFS, StageInfo, SpecItem, VerifyIssue, PriceSource } from '@/lib/types';
import { webSearch, llm, imageSearch, fetchImage, parseJsonLoose } from '@/lib/ai';
import { applyWatermark, toDataUrl, WatermarkPos, watermarkScale } from '@/lib/watermark';
import { buildProductHtml, cardFileName } from '@/lib/card-template';
import { applyJobPrice } from '@/lib/pricing';
import { pushPriceHistory } from '@/lib/reprice';
import { extractPriceCandidates, median, formatToman, toFaDigits, sanitizeFaText, sanitizeSpecs } from '@/lib/fa';
import { notifyJobDone } from '@/lib/bale-notify';

interface ProductWork {
  cardId: string;
  rawInput: string;
  inputType: 'name' | 'link' | 'image' | 'html';
  directImageUrl?: string; // لینک تصویر ارسالی کاربر
  directImageBuf?: Buffer;
  parsedTitle?: string;
  parsedDescription?: string;
  parsedPrice?: number;
  parsedSpecs?: SpecItem[];
  parsedImage?: string;
  name?: string;
  nameFa?: string;
  nameEn?: string;
  price?: number;
  priceSource?: PriceSource[];
  imageUrl?: string;
  link?: string;
  description?: string;
  usage?: string;
  specs?: SpecItem[];
  theme?: string; // تم اختصاصی کارت (خالی = تم پروسه)
  issues: VerifyIssue[];
}

export interface JobOptions {
  watermarkMode: 'text' | 'logo';
  watermarkText: string;
  watermarkPos: WatermarkPos;
  watermarkLogo?: Buffer;
  watermarkScale: number; // ضریب اندازه واترمارک
  watermarkFont: string; // کلید قلم واترمارک
  brand: string;
  cardTheme: string; // تم رنگی قالب کارت
  priceMarkup: number; // حاشیه سود قیمت‌گذاری (درصد)
  priceRound: number; // رُند کردن قیمت (۰ = بدون رُند)
}

// ─── ابزار لاگ مرحله ───
async function loadStages(jobId: string): Promise<StageInfo[]> {
  const job = await db.job.findUnique({ where: { id: jobId } });
  return job ? (JSON.parse(job.stagesLog || '[]') as StageInfo[]) : [];
}

async function saveStage(jobId: string, stage: StageInfo): Promise<void> {
  const stages = await loadStages(jobId);
  const idx = stages.findIndex((s) => s.key === stage.key);
  if (idx >= 0) {
    const prev = stages[idx];
    // حفظ لاگ‌های انباشته — آبجکت پاس‌داده‌شده ممکن است logs خالی داشته باشد
    stages[idx] = { ...stage, logs: stage.logs.length ? stage.logs : prev.logs };
  } else {
    stages.push(stage);
  }
  await db.job.update({
    where: { id: jobId },
    data: { stagesLog: JSON.stringify(stages), currentStage: stage.key },
  });
}

async function stageLog(jobId: string, key: string, line: string): Promise<void> {
  const stages = await loadStages(jobId);
  const st = stages.find((s) => s.key === key);
  if (!st) return;
  st.logs.push(line);
  if (st.logs.length > 60) st.logs = st.logs.slice(-60);
  await saveStage(jobId, st);
}

// ─── نرمال‌سازی آدرس‌ها (راستی‌آزمایی) ───
export function normalizeUrl(raw: string, base?: string): string {
  const u = (raw || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^data:image\//i.test(u)) return u;
  if (/^\/\//.test(u)) return `https:${u}`;
  try {
    if (base) return new URL(u, base).toString();
  } catch { /* ignore */ }
  if (/^www\./i.test(u)) return `https://${u}`;
  if (/^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i.test(u)) return `https://${u}`;
  return u;
}

// ─── مرحله ۱: نام‌گذاری ───
async function stageNaming(jobId: string, products: ProductWork[]): Promise<void> {
  await stageLog(jobId, 'naming', `شروع نام‌گذاری برای ${products.length} محصول…`);
  for (const p of products) {
    try {
      const query = p.inputType === 'link' ? stripUrlToName(p.rawInput) : p.parsedTitle || p.rawInput;
      await stageLog(jobId, 'naming', `🔍 جستجو برای: «${query}»`);
      const results = await webSearch(query, 10);
      if (results.length) {
        const top = results
          .slice(0, 6)
          .map((r, i) => `${i + 1}. ${r.name} — ${r.host_name}`)
          .join('\n');
        const system =
          'تو کارشناس نام‌گذاری محصولات فروشگاه اینترنتی فارسی‌زبان هستی. بهترین عنوان استاندارد محصول را از میان نتایج جستجو انتخاب و استانداردسازی کن. خروجی فقط JSON باشد با ساختار {"nameFa":"نام کامل فارسی","nameEn":"English Full Name","brand":"برند","category":"دسته محصول"}. نام فارسی الگوی «نوع محصول + برند + مدل» را داشته باشد.';
        const raw = await llm(
          system,
          `ورودی خام کاربر: «${query}»\nنتایج جستجو (صفحه اول):\n${top}\n\nبهترین و کامل‌ترین عنوان را انتخاب کن.`,
        );
        const parsed = parseJsonLoose<{ nameFa: string; nameEn: string; brand?: string; category?: string }>(raw);
        if (parsed?.nameFa) {
          p.nameFa = sanitizeFaText(parsed.nameFa);
          p.nameEn = (parsed.nameEn || '').replace(NOISE_EN, '').trim();
          p.name = p.nameEn ? `${p.nameFa} | ${p.nameEn}` : p.nameFa;
          await stageLog(jobId, 'naming', `✅ عنوان منتخب: ${p.name}`);
        } else {
          p.name = cleanTitle(query);
          await stageLog(jobId, 'naming', `⚠️ مدل پاسخ JSON نداد؛ عنوان پاک‌سازی‌شده: ${p.name}`);
        }
      } else {
        p.name = cleanTitle(query);
        await stageLog(jobId, 'naming', `⚠️ نتیجه جستجویی نبود؛ از عنوان ورودی استفاده شد`);
      }
    } catch (e) {
      p.name = cleanTitle(p.parsedTitle || p.rawInput);
      await stageLog(jobId, 'naming', `❌ خطا در نام‌گذاری: ${e instanceof Error ? e.message : 'نامشخص'}`);
    }
    await db.card.update({
      where: { id: p.cardId },
      data: { name: p.name, nameFa: p.nameFa || '', nameEn: p.nameEn || '', status: 'processing' },
    });
  }
}

function stripUrlToName(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const seg = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
    return decodeURIComponent(seg.replace(/[-_+.]+/g, ' ').replace(/\b(html|htm|aspx|php|id|p|product|products|dp)\b/gi, ''))
      .replace(/\s+/g, ' ')
      .trim() || u.hostname;
  } catch {
    return url;
  }
}

function cleanTitle(t: string): string {
  return sanitizeFaText((t || '').replace(/\s+/g, ' ')).slice(0, 140);
}

// حروف چینی/روسی/… در عنوان لاتین مجاز نیست — فقط لاتین، عدد و علائم پایه
const NOISE_EN = /[^\x00-\u024F\u200e\u200f]+/g;

// ─── مرحله ۲: قیمت‌گذاری ───
async function stagePricing(
  jobId: string,
  products: ProductWork[],
  optsMarkup: { markup: number; round: number },
): Promise<void> {
  await stageLog(
    jobId,
    'pricing',
    optsMarkup.markup > 0
      ? `شروع قیمت‌گذاری بر اساس سایت‌های همکار (حاشیه سود ${toFaDigits(optsMarkup.markup)}٪)…`
      : 'شروع قیمت‌گذاری بر اساس سایت‌های همکار…',
  );
  for (const p of products) {
    if (p.parsedPrice && p.parsedPrice > 0) {
      p.price = p.parsedPrice;
      await stageLog(jobId, 'pricing', `↩️ قیمت از فایل ورودی حفظ شد: ${formatToman(p.price)}`);
      await db.card.update({
        where: { id: p.cardId },
        data: {
          price: formatToman(p.price),
          priceValue: p.price,
          priceSource: JSON.stringify([{ site: 'فایل ورودی', price: p.price, url: p.link || '' }]),
          priceHistory: JSON.stringify(pushPriceHistory('[]', p.price, 'pipeline')),
        },
      });
      continue;
    }
    try {
      const q = `قیمت ${p.nameFa || p.name} تومان`;
      await stageLog(jobId, 'pricing', `🔍 «${q}»`);
      const results = await webSearch(q, 10);
      const sources: PriceSource[] = [];
      for (const r of results.slice(0, 8)) {
        const prices = extractPriceCandidates(`${r.name} ${r.snippet}`);
        for (const price of prices.slice(0, 2)) {
          sources.push({ site: r.host_name, price, url: r.url });
        }
      }
      if (sources.length) {
        // فیلتر دور extremes (بدون حذف کامل)
        const vals = sources.map((s) => s.price).sort((a, b) => a - b);
        const q1 = vals[Math.floor(vals.length * 0.2)];
        const q3 = vals[Math.floor(vals.length * 0.8)];
        const filtered = sources.filter((s) => s.price >= q1 * 0.5 && s.price <= q3 * 2);
        const picked = filtered.length ? filtered : sources;
        p.price = median(picked.map((s) => s.price));
        // حاشیه سود و رُند قیمت (تنظیمات قیمت‌گذاری پروسه)
        const priced = applyJobPrice(p.price, optsMarkup.markup, optsMarkup.round);
        if (priced.value !== p.price) {
          await stageLog(
            jobId,
            'pricing',
            `💰 حاشیه سود ${priced.markup > 0 ? `${toFaDigits(priced.markup)}٪` : '۰'} + رُند → ${formatToman(p.price)} به ${formatToman(priced.value)} تغییر کرد`,
          );
        }
        p.price = priced.value;
        // منابع یکتا بر اساس سایت (قیمت منبع اصلی حفظ می‌شود)
        const seen = new Set<string>();
        p.priceSource = picked.filter((s) => (seen.has(s.site) ? false : (seen.add(s.site), true))).slice(0, 5);
        await stageLog(
          jobId,
          'pricing',
          `✅ قیمت نهایی (میانه ${picked.length} منبع): ${formatToman(p.price)} — نمونه: ${p.priceSource.map((s) => s.site).join('، ')}`,
        );
      } else {
        await stageLog(jobId, 'pricing', `⚠️ قیمتی در نتایج یافت نشد؛ کارت بدون قیمت ساخته می‌شود`);
      }
    } catch (e) {
      await stageLog(jobId, 'pricing', `❌ خطا: ${e instanceof Error ? e.message : 'نامشخص'}`);
    }
    await db.card.update({
      where: { id: p.cardId },
      data: {
        price: formatToman(p.price || 0),
        priceValue: p.price || 0,
        priceSource: JSON.stringify(p.priceSource || []),
        ...(p.price && p.price > 0
          ? { priceHistory: JSON.stringify(pushPriceHistory('[]', p.price, 'pipeline')) }
          : {}),
      },
    });
  }
}

// ─── مرحله ۳: تصاویر و واترمارک ───
async function stageImages(
  jobId: string,
  products: ProductWork[],
  opts: JobOptions,
): Promise<void> {
  await stageLog(jobId, 'images', `آماده‌سازی تصاویر با واترمارک «${opts.watermarkMode === 'text' ? opts.watermarkText : 'لوگو کاربر'}»…`);
  for (const p of products) {
    try {
      let buf: Buffer | null = null;
      if (p.directImageBuf) {
        buf = p.directImageBuf;
        await stageLog(jobId, 'images', `🖼️ تصویر ارسالی کاربر استفاده شد`);
      } else if (p.parsedImage && /^data:image\//.test(p.parsedImage)) {
        buf = Buffer.from(p.parsedImage.split(',')[1] || '', 'base64');
        await stageLog(jobId, 'images', `🖼️ تصویر کارت ورودی استخراج شد`);
      } else {
        const direct = p.directImageUrl ? await fetchImage(normalizeUrl(p.directImageUrl)) : null;
        if (direct) {
          buf = direct.buf;
          await stageLog(jobId, 'images', `🖼️ تصویر از لینک ارسالی دریافت شد`);
        }
      }

      if (!buf) {
        const queryEn = p.nameEn || p.name || p.rawInput;
        const query = `product photo of ${queryEn} white background`;
        await stageLog(jobId, 'images', `🔍 جستجوی تصویر: «${queryEn}»`);
        const hits = await imageSearch(query, 6);
        for (const hit of hits.slice(0, 4)) {
          const got = await fetchImage(hit.original_url);
          if (got) {
            buf = got.buf;
            await stageLog(jobId, 'images', `✅ تصویر از منبع ${hit.source || 'web'} دریافت شد`);
            break;
          }
        }
      }

      if (!buf) {
        await stageLog(jobId, 'images', `❌ تصویر مناسبی پیدا نشد`);
        p.issues.push({ item: 'تصویر', ok: false, fixed: false, detail: 'تصویر یافت نشد' });
      } else {
        const wm = await applyWatermark(buf, {
          mode: opts.watermarkMode,
          text: opts.watermarkMode === 'text' ? opts.watermarkText : undefined,
          logoBuf: opts.watermarkMode === 'logo' ? opts.watermarkLogo : undefined,
          pos: opts.watermarkPos,
          scale: opts.watermarkScale,
          font: opts.watermarkFont,
        });
        p.imageUrl = toDataUrl(wm.buf, 'image/png');
        await stageLog(jobId, 'images', `🎨 واترمارک اعمال و تصویر بهینه شد (${wm.width}×${wm.height})`);
      }
    } catch (e) {
      await stageLog(jobId, 'images', `❌ خطای تصویر: ${e instanceof Error ? e.message : 'نامشخص'}`);
    }
    await db.card.update({ where: { id: p.cardId }, data: { imageUrl: p.imageUrl || '' } });
  }
}

// ─── مرحله ۴: راستی‌آزمایی ───
async function stageVerify(jobId: string, products: ProductWork[]): Promise<void> {
  await stageLog(jobId, 'verify', 'بررسی کامل بودن اطلاعات هر کارت…');
  for (const p of products) {
    // نام
    p.issues.push({
      item: 'نام',
      ok: !!p.name,
      fixed: false,
      detail: p.name ? 'عنوان موجود است' : 'عنوان مفقود — از ورودی خام استفاده می‌شود',
    });
    if (!p.name) p.name = cleanTitle(p.rawInput);
    // تصویر
    p.issues.push({
      item: 'تصویر',
      ok: !!p.imageUrl,
      fixed: false,
      detail: p.imageUrl ? 'تصویر با واترمارک آماده است' : 'تصویر مفقود — تلاش مجدد',
    });
    if (!p.imageUrl) {
      try {
        const hits = await imageSearch(`photo of ${p.nameEn || p.name || p.rawInput}`, 3);
        for (const h of hits) {
          const got = await fetchImage(h.original_url);
          if (got) {
            const wm = await applyWatermark(got.buf, {
              mode: 'text',
              text: p.rawInput.slice(0, 30),
              pos: 'bottom-right',
              scale: 0.75,
            });
            p.imageUrl = toDataUrl(wm.buf, 'image/png');
            p.issues[p.issues.length - 1].fixed = true;
            p.issues[p.issues.length - 1].detail = 'تصویر در راستی‌آزمایی جایگزین شد';
            break;
          }
        }
      } catch { /* ignore */ }
    }
    // لینک
    const fixedLink = normalizeUrl(p.link || (isUrl(p.rawInput) ? p.rawInput : ''));
    if (fixedLink !== (p.link || '')) {
      p.issues.push({
        item: 'لینک',
        ok: !!fixedLink,
        fixed: !!fixedLink,
        detail: fixedLink ? `آدرس اصلاح شد: ${fixedLink.slice(0, 60)}…` : 'لینکی موجود نبود',
      });
    } else {
      p.issues.push({
        item: 'لینک',
        ok: !!fixedLink,
        fixed: false,
        detail: fixedLink ? 'لینک سالم است' : 'لینک مرجع ارسال نشده (اختیاری)',
      });
    }
    p.link = fixedLink;
    // قیمت
    p.issues.push({
      item: 'قیمت',
      ok: !!p.price,
      fixed: false,
      detail: p.price ? `قیمت نهایی: ${formatToman(p.price)}` : 'قیمت یافت نشد — کارت بدون قیمت',
    });
    const okCount = p.issues.filter((i) => i.ok).length;
    await stageLog(jobId, 'verify', `${okCount >= 3 ? '✅' : '⚠️'} «${p.name}»: ${okCount}/۴ مورد سالم`);
    await db.card.update({
      where: { id: p.cardId },
      data: { issues: JSON.stringify(p.issues), link: p.link, name: p.name, imageUrl: p.imageUrl || '' },
    });
  }
}

function isUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}

// ─── مرحله ۵: بهینه‌سازی ───
async function stageOptimize(jobId: string, products: ProductWork[]): Promise<void> {
  await stageLog(jobId, 'optimize', 'ویرایش متون، بهبود توضیحات و مشخصات با هوش مصنوعی…');
  for (const p of products) {
    try {
      const system = `تو کارشناس محتوای فروشگاه‌های اینترنتی ایرانی هستی. برای کارت محصول فارسی محتوا تولید می‌کنی.
خروجی فقط JSON معتبر با این ساختار:
{"description":"توضیح ۳ تا ۴ جمله‌ای روان و فروشنده فارسی","usage":"روش مصرف گام‌به‌گام کوتاه","specs":[{"key":"برند","value":"…"},…]}
جدول مشخصات ۸ تا ۱۲ ردیف شامل برند، نوع محصول، مدل، کشور سازنده، حجم/وزن، مناسب برای و ویژگی‌های کلیدی باشد. اگر اطلاعاتی دیده نشد مقدار منطقی و محتمل بنویس. از ارقام فارسی استفاده کن.`;
      const context = [
        `عنوان: ${p.name}`,
        p.description ? `توضیح فعلی: ${p.description}` : '',
        p.usage ? `روش مصرف فعلی: ${p.usage}` : '',
        p.specs?.length ? `مشخصات فعلی: ${JSON.stringify(p.specs)}` : '',
        p.rawInput !== p.name ? `ورودی خام: ${p.rawInput}` : '',
        p.priceSource?.length ? `سایت‌های مرجع قیمت: ${p.priceSource.map((s) => s.site).join('، ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      const raw = await llm(system, context);
      const parsed = parseJsonLoose<{ description: string; usage: string; specs: SpecItem[] }>(raw);
      if (parsed?.description) {
        p.description = sanitizeFaText(parsed.description);
        p.usage = sanitizeFaText(parsed.usage || '');
        p.specs = sanitizeSpecs(
          Array.isArray(parsed.specs)
            ? parsed.specs
                .map((s) => ({ key: String(s?.key || ''), value: String(s?.value || '') }))
                .filter((s) => s.key && s.value)
                .slice(0, 14)
            : [],
        );
        await stageLog(jobId, 'optimize', `✅ محتوای «${p.nameFa || p.name}» بهینه شد (${p.specs.length} ردیف مشخصات)`);
      } else {
        p.description = p.description || fallbackDescription(p);
        await stageLog(jobId, 'optimize', `⚠️ پاسخ مدل نامعتبر؛ متن پایه حفظ شد`);
      }
    } catch (e) {
      p.description = p.description || fallbackDescription(p);
      await stageLog(jobId, 'optimize', `❌ خطا: ${e instanceof Error ? e.message : 'نامشخص'}`);
    }
    await db.card.update({
      where: { id: p.cardId },
      data: { description: p.description, usage: p.usage || '', specs: JSON.stringify(p.specs || []) },
    });
  }
}

function fallbackDescription(p: ProductWork): string {
  return sanitizeFaText(`${p.nameFa || p.name} با کیفیتی عالی و قیمتی مناسب، انتخابی هوشمندانه برای نیاز شماست. این محصول با استانداردهای روز تولید شده و رضایت کاربران را جلب کرده است. برای مشاهده جزئیات بیشتر و ثبت سفارش، کارت محصول را کامل مطالعه کنید.`);
}

// ─── مرحله ۶: ساخت کارت ───
async function stageBuild(
  jobId: string,
  products: ProductWork[],
  brand: string,
  jobTheme: string,
): Promise<void> {
  await stageLog(jobId, 'build', `ساخت کارت و صفحه محصول HTML راست‌به‌چپ (تم: ${jobTheme})…`);
  for (const p of products) {
    try {
      const html = buildProductHtml({
        title: p.name || 'محصول',
        description: p.description || '',
        price: p.price ? formatToman(p.price) : '',
        imageUrl: p.imageUrl || '',
        specs: p.specs || [],
        usage: p.usage,
        link: p.link,
        brand,
        theme: p.theme || jobTheme,
      });
      await db.card.update({
        where: { id: p.cardId },
        data: {
          html,
          theme: p.theme || jobTheme,
          status: p.imageUrl || p.description ? 'done' : 'error',
          error: p.imageUrl || p.description ? '' : 'کارت خالی ماند',
        },
      });
      await stageLog(jobId, 'build', `📄 ${cardFileName(p.name || 'product', p.cardId)} ساخته شد`);
    } catch (e) {
      await db.card.update({ where: { id: p.cardId }, data: { status: 'error', error: String(e) } });
      await stageLog(jobId, 'build', `❌ خطا در ساخت کارت: ${e instanceof Error ? e.message : 'نامشخص'}`);
    }
  }
  await stageLog(jobId, 'build', '🎉 همه کارت‌ها آماده‌اند. خروجی تکی و ZIP در دسترس است.');
}

// ─── اجرای کامل پروسه ───
export async function runPipeline(jobId: string): Promise<void> {
  const t0 = Date.now();
  try {
    const job = await db.job.findUnique({ where: { id: jobId }, include: { cards: true } });
    if (!job) return;
    const opts: JobOptions = {
      watermarkMode: (job.watermarkMode as 'text' | 'logo') || 'text',
      watermarkText: job.watermarkText || '',
      watermarkPos: (job.watermarkPos as WatermarkPos) || 'bottom-right',
      watermarkLogo: job.watermarkLogo?.startsWith('data:')
        ? Buffer.from(job.watermarkLogo.split(',')[1] || '', 'base64')
        : undefined,
      watermarkScale: watermarkScale(job.watermarkSize),
      watermarkFont: job.watermarkFont || 'vazirmatn',
      brand: job.watermarkText || '',
      cardTheme: job.cardTheme || 'emerald',
      priceMarkup: job.priceMarkup || 0,
      priceRound: job.priceRound ?? 1000,
    };

    const products: ProductWork[] = job.cards.map((c) => ({
      cardId: c.id,
      rawInput: c.rawInput,
      inputType: c.inputType as ProductWork['inputType'],
      directImageUrl: c.imageUrl?.startsWith('http') ? c.imageUrl : undefined,
      directImageBuf: c.imageUrl?.startsWith('data:') ? Buffer.from(c.imageUrl.split(',')[1] || '', 'base64') : undefined,
      parsedTitle: c.name || undefined,
      parsedDescription: c.description || undefined,
      parsedPrice: c.priceValue > 0 ? c.priceValue : undefined,
      parsedSpecs: safeSpecs(c.specs),
      parsedImage: c.imageUrl?.startsWith('data:') ? c.imageUrl : undefined,
      link: c.link || undefined,
      theme: c.theme || undefined,
      issues: [],
    }));

    // باطل‌کردن نسخه انگلیسی قدیمی — محتوا از نو ساخته می‌شود
    await db.card.updateMany({
      where: { jobId },
      data: { htmlEn: '', descriptionEn: '', usageEn: '', specsEn: '[]' },
    });

    await db.job.update({ where: { id: jobId }, data: { status: 'running' } });

    const stages: StageKey[] = ['naming', 'pricing', 'images', 'verify', 'optimize', 'build'];
    const runners: Record<string, () => Promise<void>> = {
      naming: () => stageNaming(jobId, products),
      pricing: () => stagePricing(jobId, products, { markup: opts.priceMarkup, round: opts.priceRound }),
      images: () => stageImages(jobId, products, opts),
      verify: () => stageVerify(jobId, products),
      optimize: () => stageOptimize(jobId, products),
      build: () => stageBuild(jobId, products, opts.brand, opts.cardTheme),
    };

    for (const key of stages) {
      const st: StageInfo = { key, title: STAGE_DEFS.find((d) => d.key === key)!.title, status: 'running', logs: [], startedAt: new Date().toISOString() };
      await saveStage(jobId, st);
      try {
        await runners[key]();
        st.status = 'done';
      } catch (e) {
        st.status = 'error';
        st.logs.push(`❌ خطای مرحله: ${e instanceof Error ? e.message : 'نامشخص'}`);
        await saveStage(jobId, st);
        await db.job.update({ where: { id: jobId }, data: { status: 'error', error: String(e) } });
        return;
      }
      st.endedAt = new Date().toISOString();
      await saveStage(jobId, st);
    }

    const secs = Math.round((Date.now() - t0) / 1000);
    await db.job.update({ where: { id: jobId }, data: { status: 'done', currentStage: '', error: '' } });
    console.log(`pipeline job ${jobId} done in ${secs}s`);

    // اعلان اختیاری پایان پردازش در ربات بله (جانبی و بی‌خطر)
    void notifyJobDone(jobId, {
      status: 'done',
      durationSec: secs,
      watermarkText: opts.watermarkText,
      cards: products.map((p) => ({
        name: p.nameFa || p.name || 'بدون عنوان',
        price: p.price ? formatToman(p.price) : '',
        ok: !!(p.imageUrl || p.description),
      })),
    }, process.env.APP_ORIGIN || undefined);
  } catch (e) {
    console.error('pipeline fatal:', e);
    const msg = e instanceof Error ? e.message : String(e);
    await db.job
      .update({ where: { id: jobId }, data: { status: 'error', error: msg } })
      .catch(() => {});
    void notifyJobDone(jobId, {
      status: 'error',
      durationSec: Math.round((Date.now() - t0) / 1000),
      watermarkText: '',
      cards: [],
    });
  }
}

type StageKey = (typeof STAGE_DEFS)[number]['key'];

function safeSpecs(s: string): SpecItem[] {
  try {
    const v = JSON.parse(s || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export { formatToman, toFaDigits };
