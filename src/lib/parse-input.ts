// تجزیه ورودی‌های کاربر: متن (نام/لینک)، فایل HTML، ZIP، تصاویر
import { SpecItem } from '@/lib/types';
import { extractPriceCandidates, median, toEnDigits } from '@/lib/fa';

export interface SeedProduct {
  rawInput: string;
  inputType: 'name' | 'link' | 'image' | 'html';
  name?: string;
  description?: string;
  usage?: string;
  priceValue?: number;
  specs?: SpecItem[];
  imageUrl?: string; // http(s) یا data:
  link?: string;
}

const isProbablyUrl = (s: string) => /^(https?:\/\/|www\.)\S+$/i.test(s.trim());
const isImageUrl = (s: string) =>
  isProbablyUrl(s) && (/\.(png|jpe?g|webp|gif|bmp|avif)(\?|$)/i.test(s) || /^https?:\/\/.*[?&](?:url|img)=/i.test(s));

/** خطوط متنی ورودی را به محصول تبدیل می‌کند */
export function parseLines(lines: string[]): SeedProduct[] {
  const out: SeedProduct[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (isImageUrl(line)) {
      out.push({ rawInput: line, inputType: 'image', imageUrl: line, name: guessNameFromUrl(line) });
    } else if (isProbablyUrl(line)) {
      out.push({ rawInput: line, inputType: 'link', link: line, name: guessNameFromUrl(line) });
    } else {
      out.push({ rawInput: line, inputType: 'name' });
    }
  }
  return out;
}

function guessNameFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const seg = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
    return decodeURIComponent(seg)
      .replace(/\.(png|jpe?g|webp|gif|bmp|avif|html?|aspx|php)$/i, '')
      .replace(/[-_+.]+/g, ' ')
      .replace(/\b(product|products|p|dp|item)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim() || u.hostname;
  } catch {
    return url;
  }
}

/** HTML کارت موجود را برای بازسازی/ویرایش استخراج می‌کند */
export function parseHtmlCard(html: string, fileName: string): SeedProduct | null {
  try {
    const title =
      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ||
      html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ||
      fileName.replace(/\.html?$/i, '');
    const desc =
      html.match(/<p[^>]*style="[^"]*pre-line[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ||
      html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ||
      '';
    const priceText =
      html.match(/color:\s*#16a34a[^>]*>([^<]*تومان[^<]*)</i)?.[1] ||
      html.match(/>([\d۰-۹,،٬٬\s]+تومان)</i)?.[1] ||
      '';
    const prices = extractPriceCandidates(toEnDigits(priceText));
    const imgSrc =
      html.match(/<img[^>]+src="(data:image\/[^"]+)"/i)?.[1] ||
      html.match(/<img[^>]+src="(https?:\/\/[^"]+)"/i)?.[1] ||
      '';
    // جدول مشخصات
    const specs: SpecItem[] = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr: RegExpExecArray | null;
    while ((tr = trRe.exec(html)) !== null) {
      const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
        m[1].replace(/<[^>]+>/g, '').trim()
      );
      if (tds.length >= 2 && tds[0] && tds[1] && tds[0] !== 'ویژگی‌های محصول') {
        specs.push({ key: tds[0], value: tds[1] });
      }
    }
    const usage =
      html.match(/روش مصرف<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || '';
    if (!title && !imgSrc && !desc) return null;
    return {
      rawInput: title || fileName,
      inputType: 'html',
      name: title,
      description: desc,
      priceValue: prices.length ? median(prices) : undefined,
      specs: specs.slice(0, 14),
      imageUrl: imgSrc || undefined,
      usage,
    };
  } catch {
    return null;
  }
}

/** فایل‌های آپلودشده را به محصولات تبدیل می‌کند */
export async function parseFiles(
  files: File[],
): Promise<{ seeds: SeedProduct[]; logoBuf: Buffer | null; skipped: string[] }> {
  const seeds: SeedProduct[] = [];
  const imageBufs: { name: string; buf: Buffer }[] = [];
  let logoBuf: Buffer | null = null;
  const skipped: string[] = [];

  for (const f of files) {
    const name = f.name || 'file';
    const lower = name.toLowerCase();
    try {
      if (lower.endsWith('.zip')) {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(await f.arrayBuffer());
        const entries = Object.values(zip.files);
        // لوگو داخل zip؟
        for (const e of entries) {
          if (/\b(logo|watermark|واترمارک|لوگو)[^/]*\.(png|svg|jpe?g)$/i.test(e.name) && !e.dir) {
            logoBuf = Buffer.from(await e.async('arraybuffer'));
            break;
          }
        }
        for (const e of entries) {
          if (e.dir) continue;
          const en = e.name.toLowerCase();
          if (en.endsWith('.html') || en.endsWith('.htm')) {
            const html = await e.async('string');
            const seed = parseHtmlCard(html, e.name.split('/').pop() || e.name);
            if (seed) seeds.push(seed);
          } else if (/\.(png|jpe?g|webp|gif|bmp|avif)$/.test(en)) {
            imageBufs.push({ name: e.name, buf: Buffer.from(await e.async('arraybuffer')) });
          } else {
            skipped.push(e.name);
          }
        }
      } else if (lower.endsWith('.html') || lower.endsWith('.htm')) {
        const html = await f.text();
        const seed = parseHtmlCard(html, name);
        if (seed) seeds.push(seed);
        else skipped.push(name);
      } else if (/\.(png|jpe?g|webp|gif|bmp|avif)$/.test(lower)) {
        // اولین تصویر می‌تواند لوگو باشد اگر نامش logo باشد
        if (/logo|لوگو/i.test(name) && !logoBuf) {
          logoBuf = Buffer.from(await f.arrayBuffer());
        } else {
          imageBufs.push({ name, buf: Buffer.from(await f.arrayBuffer()) });
        }
      } else if (/\.(txt|csv)$/i.test(lower)) {
        const text = await f.text();
        seeds.push(...parseLines(text.split(/\r?\n/)));
      } else {
        skipped.push(name);
      }
    } catch (e) {
      skipped.push(`${name} (${e instanceof Error ? e.message : 'خطا'})`);
    }
  }

  // تصاویر آپلودی: اگر در کنارشان محصول متنی/HTML در صف است → پیوست همان محصول
  if (imageBufs.length) {
    const ext = (n: string) => (n.match(/\.(png|jpe?g|webp|gif|bmp|avif)$/i)?.[0] || '.png').toLowerCase();
    for (const im of imageBufs) {
      const dataUrl = `data:image/${ext(im.name).replace('.', '')};base64,${im.buf.toString('base64')}`;
      seeds.push({
        rawInput: guessNameFromUrl(im.name) || im.name,
        inputType: 'image',
        name: guessNameFromUrl(im.name),
        imageUrl: dataUrl,
      });
    }
  }

  return { seeds, logoBuf, skipped };
}

/** ادغام seeds فایل با خطوط متنی (جفت‌سازی ترتیبی تصویر↔محصول) */
export function mergeSeeds(textSeeds: SeedProduct[], fileSeeds: SeedProduct[]): SeedProduct[] {
  const out = [...textSeeds];
  const imageSeeds = fileSeeds.filter((s) => s.inputType === 'image' && s.imageUrl?.startsWith('data:'));
  const otherSeeds = fileSeeds.filter((s) => !(s.inputType === 'image' && s.imageUrl?.startsWith('data:')));
  // تصاویر data: را روی محصولات متنی همان اندیس می‌گذاریم
  let idx = 0;
  for (const s of out) {
    if (idx >= imageSeeds.length) break;
    if (s.inputType === 'name' && !s.imageUrl) {
      s.imageUrl = imageSeeds[idx].imageUrl;
      s.inputType = 'image';
      idx++;
    }
  }
  while (idx < imageSeeds.length) out.push(imageSeeds[idx++]);
  return [...out, ...otherSeeds];
}
