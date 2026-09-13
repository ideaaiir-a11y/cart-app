// واترمارک‌گذاری تصاویر با sharp — متن فارسی (چند قلم) یا لوگو
import sharp from 'sharp';

export type WatermarkPos =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'center'
  | 'diagonal';

export interface WatermarkOptions {
  mode: 'text' | 'logo';
  text?: string;
  logoBuf?: Buffer;
  pos?: WatermarkPos;
  opacity?: number; // 0..1
  scale?: number; // ضریب اندازه متن/لوگو (۰.۷۵ کوچک، ۱ متوسط، ۱.۳۵ بزرگ)
  font?: string; // کلید قلم — WATERMARK_FONTS
}

export const WATERMARK_SCALES: Record<string, number> = {
  small: 0.75,
  medium: 1,
  large: 1.35,
};

export function watermarkScale(size?: string | null): number {
  return WATERMARK_SCALES[size || 'medium'] ?? 1;
}

/** قلم‌های در دسترس واترمارک (روی سرور با fontconfig نصب شده‌اند) */
export const WATERMARK_FONTS: Record<
  string,
  { stack: string; weight: string; label: string }
> = {
  vazirmatn: { stack: 'Vazirmatn, DejaVu Sans, sans-serif', weight: '700', label: 'وزیرمتن' },
  'vazirmatn-black': { stack: 'Vazirmatn Black, Vazirmatn, DejaVu Sans, sans-serif', weight: '900', label: 'وزیرمتن سیاه' },
  lalezar: { stack: 'Lalezar, Vazirmatn, DejaVu Sans, sans-serif', weight: '400', label: 'لاله‌زار' },
  amiri: { stack: 'Amiri, Vazirmatn, DejaVu Sans, serif', weight: '700', label: 'امیری' },
};

export function watermarkFontStack(font?: string | null): { stack: string; weight: string } {
  return WATERMARK_FONTS[font || 'vazirmatn'] ?? WATERMARK_FONTS.vazirmatn;
}

const SIZE = 900; // خروجی مربع ۹۰۰×۹۰۰ — هماهنگ با aspect-ratio کارت

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** برچسب گوشه‌ای — متن وسط‌چین داخل قرص با عرض سخاوتمندانه (سازگار با librsvg) */
function badge(
  px: number,
  py: number,
  t: string,
  opacity: number,
  fontSize = 22,
  font?: string,
): string {
  // fontSize از قبل با scale ضرب شده است
  const { stack, weight } = watermarkFontStack(font);
  const textW = Math.max(96, Math.round(t.length * fontSize * 0.58) + 44);
  const pillH = Math.round(fontSize * 2);
  const W = SIZE;
  const H = SIZE;
  let x = px;
  let y = py;
  x = Math.max(8, Math.min(x, W - 8 - textW));
  y = Math.max(8, Math.min(y, H - 8 - pillH));
  const cx = x + textW / 2;
  const cy = y + pillH / 2;
  return `<g opacity="${opacity}">
    <rect x="${x}" y="${y}" width="${textW}" height="${pillH}" rx="${pillH / 2}" fill="rgba(0,0,0,0.38)"/>
    <text x="${cx}" y="${cy + Math.round(fontSize * 0.36)}" text-anchor="middle" font-family="${stack}" font-size="${fontSize}" font-weight="${weight}" fill="#ffffff">${t}</text>
  </g>`;
}

/** لایه SVG واترمارک متنی — تکرار مورب + برچسب گوشه */
function textOverlaySvg(
  text: string,
  pos: WatermarkPos,
  opacity: number,
  scale = 1,
  font?: string,
): string {
  const t = escapeXml(text.slice(0, 40)) || 'Card';
  const { stack, weight } = watermarkFontStack(font);
  const W = SIZE;
  const H = SIZE;
  const parts: string[] = [];

  if (pos === 'diagonal') {
    const step = Math.round(200 * Math.max(0.85, scale));
    const fs = Math.round(26 * scale);
    for (let row = -1; row * step < H + step; row++) {
      const offset = row % 2 === 0 ? 0 : Math.round(step * 0.55);
      for (let col = -1; col * step < W + step; col++) {
        const x = col * step + offset + step / 2;
        const y = row * step + step / 2;
        parts.push(
          `<text x="${x}" y="${y}" transform="rotate(-28 ${x} ${y})" text-anchor="middle" font-family="${stack}" font-size="${fs}" font-weight="800" fill="rgba(255,255,255,${(opacity * 0.55).toFixed(2)})" stroke="rgba(0,0,0,0.16)" stroke-width="0.7">${t}</text>`
        );
      }
    }
  }

  const fsBadge = Math.round(22 * scale);
  const pad = 20;
  const bw = Math.max(96, Math.round(t.length * fsBadge * 0.58) + 44);
  if (pos === 'bottom-right' || pos === 'diagonal') parts.push(badge(W - pad - bw, H - pad - fsBadge * 2, t, opacity, fsBadge, font));
  if (pos === 'bottom-left') parts.push(badge(pad, H - pad - fsBadge * 2, t, opacity, fsBadge, font));
  if (pos === 'top-right') parts.push(badge(W - pad - bw, pad, t, opacity, fsBadge, font));
  if (pos === 'top-left') parts.push(badge(pad, pad, t, opacity, fsBadge, font));
  if (pos === 'center') {
    const fs = Math.round(30 * scale);
    const textW = Math.max(120, Math.round(t.length * fs * 0.58) + 48);
    const pillH = Math.round(fs * 2);
    parts.push(
      `<g opacity="${Math.min(1, opacity + 0.1)}">
        <rect x="${W / 2 - textW / 2}" y="${H / 2 - pillH / 2}" width="${textW}" height="${pillH}" rx="${pillH / 2}" fill="rgba(0,0,0,0.38)"/>
        <text x="${W / 2}" y="${H / 2 + Math.round(fs * 0.36)}" text-anchor="middle" font-family="${stack}" font-size="${fs}" font-weight="${weight}" fill="#ffffff">${t}</text>
      </g>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('')}</svg>`;
}

/** نرمال‌سازی تصویر به مربع ۹۰۰×۹۰۰ و اعمال واترمارک — خروجی PNG برای embed */
export async function applyWatermark(
  imageBuf: Buffer,
  opts: WatermarkOptions
): Promise<{ buf: Buffer; width: number; height: number }> {
  const base = sharp(imageBuf, { failOn: 'none' })
    .rotate() // احترام به EXIF
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .png({ quality: 92, compressionLevel: 9 });

  const pos = (opts.pos || 'bottom-right') as WatermarkPos;
  const opacity = typeof opts.opacity === 'number' ? opts.opacity : 0.85;

  let composed = base;
  try {
    if (opts.mode === 'text' && opts.text?.trim()) {
      const svg = Buffer.from(
        textOverlaySvg(opts.text.trim(), pos, opacity, watermarkScaleFromOpts(opts), opts.font),
        'utf-8',
      );
      composed = base.composite([{ input: svg, blend: 'over' }]);
    } else if (opts.mode === 'logo' && opts.logoBuf?.length) {
      const logoMeta = await sharp(opts.logoBuf, { failOn: 'none' }).metadata();
      const lw = Math.max(1, logoMeta.width || 200);
      const lh = Math.max(1, logoMeta.height || 200);
      const maxFrac = 0.26 * watermarkScaleFromOpts(opts);
      const scale = Math.min(1, (SIZE * maxFrac) / lw, (SIZE * maxFrac) / lh);
      const resizedLogo = await sharp(opts.logoBuf, { failOn: 'none' })
        .resize(Math.round(lw * scale), Math.round(lh * scale), { fit: 'inside' })
        .toBuffer();
      // موقعیت‌دهی لوگو روی بوم
      const W = SIZE;
      const H = SIZE;
      const m = await sharp(resizedLogo).metadata();
      const fw = m.width || 200;
      const fh = m.height || 200;
      const pad = 24;
      let left = pad;
      let top = H - pad - fh;
      if (pos === 'bottom-right') left = W - pad - fw;
      if (pos === 'top-left') top = pad;
      if (pos === 'top-right') {
        left = W - pad - fw;
        top = pad;
      }
      if (pos === 'center' || pos === 'diagonal') {
        left = Math.round((W - fw) / 2);
        top = Math.round((H - fh) / 2);
      }
      const canvas = sharp({
        create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      }).composite([
        { input: resizedLogo, left, top, blend: 'over' },
      ]);
      const logoLayer = await canvas.png().toBuffer();
      composed = base.composite([
        { input: logoLayer, blend: 'over' },
      ]);
    }
  } catch (e) {
    console.error('watermark compose failed, fallback base image:', e);
  }

  const out = await composed.toBuffer();
  return { buf: out, width: SIZE, height: SIZE };
}

/** تبدیل به data URL قابل جاسازی در HTML */
export function toDataUrl(buf: Buffer, contentType = 'image/png'): string {
  return `data:${contentType};base64,${buf.toString('base64')}`;
}

function watermarkScaleFromOpts(opts: WatermarkOptions): number {
  return typeof opts.scale === 'number' && opts.scale > 0 ? opts.scale : 1;
}

/** تصویر نمونه گرادیانی برای پیش‌نمایش زنده واترمارک (بدون نیاز به اینترنت) */
export async function sampleImage(): Promise<Buffer> {
  const W = 900;
  const H = 900;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fde68a"/>
        <stop offset="0.5" stop-color="#a7f3d0"/>
        <stop offset="1" stop-color="#6ee7b7"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="${W / 2}" cy="400" r="190" fill="rgba(255,255,255,0.75)"/>
    <rect x="330" y="640" width="240" height="26" rx="13" fill="rgba(255,255,255,0.85)"/>
    <rect x="280" y="690" width="340" height="18" rx="9" fill="rgba(255,255,255,0.6)"/>
  </svg>`;
  return sharp(Buffer.from(svg, 'utf-8')).png().toBuffer();
}
