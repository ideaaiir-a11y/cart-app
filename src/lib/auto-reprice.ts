// ─────────────────────────────────────────────────────────────
// زمان‌بند خودکار «قیمت روز» — به‌روزرسانی شبانه قیمت کارت‌های قدیمی
// شروع: src/instrumentation.ts هنگام بوت سرور (هر ۵ دقیقه تیک می‌خورد)
// تنظیمات: autoReprice | autoRepriceHour | autoRepriceAgeDays | autoRepriceNotify
//          autoRepriceLastDate | autoRepriceLastResult (داخلی)
// ─────────────────────────────────────────────────────────────
import { db } from '@/lib/db';
import { repriceOneCard, PriceHistoryRow } from '@/lib/reprice';
import { formatToman, toFaDigits } from '@/lib/fa';

const BALE_API = 'https://tapi.bale.ai';
const MAX_CARDS_PER_RUN = 12;

export interface AutoRepriceConfig {
  enabled: boolean;
  hour: number;
  ageDays: number;
  notify: boolean;
  lastDate: string;
  lastResult: AutoRepriceResult | null;
}

export interface AutoRepriceResult {
  at: string;
  trigger: 'schedule' | 'manual';
  total: number; // کارت‌های واجد شرط
  updated: number;
  confirmed: number;
  failed: number;
  skipped: boolean;
  note: string;
  details: { name: string; oldPrice: number; newPrice: number; ok: boolean; error?: string }[];
}

async function getSetting(key: string): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? '';
}

async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function getAutoRepriceConfig(): Promise<AutoRepriceConfig> {
  const rows = await db.setting.findMany({
    where: { key: { in: ['autoReprice', 'autoRepriceHour', 'autoRepriceAgeDays', 'autoRepriceNotify', 'autoRepriceLastDate', 'autoRepriceLastResult'] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const hour = Math.round(Number(map.autoRepriceHour));
  const ageDays = Math.round(Number(map.autoRepriceAgeDays));
  let lastResult: AutoRepriceResult | null = null;
  try {
    if (map.autoRepriceLastResult) lastResult = JSON.parse(map.autoRepriceLastResult);
  } catch { /* ignore */ }
  return {
    enabled: map.autoReprice === '1',
    hour: isFinite(hour) && hour >= 0 && hour <= 23 ? hour : 3,
    ageDays: isFinite(ageDays) && ageDays >= 1 && ageDays <= 90 ? ageDays : 7,
    notify: map.autoRepriceNotify === '1',
    lastDate: map.autoRepriceLastDate || '',
    lastResult,
  };
}

/** تاریخ امروز به‌صورت YYYY-MM-DD بر اساس زمان محلی سرور */
function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** شمار کارت‌های واجد شرط (done + قیمت‌دار + قدیمی‌تر از ageDays) */
export async function countEligibleCards(ageDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000);
  return db.card.count({
    where: {
      status: 'done',
      priceValue: { gt: 0 },
      updatedAt: { lt: cutoff },
    },
  });
}

/** یک دور کامل اجرای به‌روزرسانی قیمت — هرگز خطا پرتاب نمی‌کند */
export async function runAutoRepriceOnce(
  trigger: 'schedule' | 'manual',
  opts: { force?: boolean } = {},
): Promise<AutoRepriceResult> {
  const cfg = await getAutoRepriceConfig();
  const cutoff = new Date(Date.now() - cfg.ageDays * 24 * 60 * 60 * 1000);
  const cards = await db.card.findMany({
    where: {
      status: 'done',
      priceValue: { gt: 0 },
      updatedAt: { lt: cutoff },
    },
    orderBy: { updatedAt: 'asc' }, // قدیمی‌ترین‌ها اول
    take: MAX_CARDS_PER_RUN,
    include: { job: true },
  });

  const result: AutoRepriceResult = {
    at: new Date().toISOString(),
    trigger,
    total: cards.length,
    updated: 0,
    confirmed: 0,
    failed: 0,
    skipped: false,
    note: '',
    details: [],
  };

  if (!cards.length) {
    result.skipped = true;
    result.note = 'کارتی واجد شرط برای به‌روزرسانی نبود';
  } else {
    const baleLines: string[] = [];
    for (const card of cards) {
      const name = card.name || card.rawInput;
      try {
        const out = await repriceOneCard(card, card.job, { srcTag: 'auto' as PriceHistoryRow['src'] });
        if (out.ok && out.found) {
          if (out.newPrice !== out.oldPrice) {
            result.updated++;
            result.details.push({ name, oldPrice: out.oldPrice, newPrice: out.newPrice, ok: true });
            baleLines.push(`💰 ${name}: ${formatToman(out.oldPrice)} ← ${formatToman(out.newPrice)}`);
          } else {
            result.confirmed++;
            result.details.push({ name, oldPrice: out.oldPrice, newPrice: out.newPrice, ok: true });
            baleLines.push(`✅ ${name}: تأیید شد (${formatToman(out.newPrice)})`);
          }
        } else {
          result.failed++;
          result.details.push({ name, oldPrice: card.priceValue, newPrice: card.priceValue, ok: false, error: out.error });
          baleLines.push(`⚠️ ${name}: ${out.error || 'به‌روزرسانی نشد'}`);
        }
      } catch (e) {
        result.failed++;
        const msg = e instanceof Error ? e.message : 'خطای ناشناخته';
        result.details.push({ name, oldPrice: card.priceValue, newPrice: card.priceValue, ok: false, error: msg });
        baleLines.push(`⚠️ ${name}: ${msg}`);
      }
    }

    // اعلان بله (مستقل از سوییچ پایان پروسه — سوییچ اختصاصی autoRepriceNotify)
    if (cfg.notify) {
      try {
        const rows = await db.setting.findMany({ where: { key: { in: ['baleToken', 'baleChatId'] } } });
        const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        if (m.baleToken && m.baleChatId) {
          const head = [
            `🤖 به‌روزرسانی خودکار شبانه قیمت‌ها`,
            `📦 ${toFaDigits(result.total)} کارت بررسی شد — ${toFaDigits(result.updated)} به‌روزرسانی، ${toFaDigits(result.confirmed)} تأیید، ${toFaDigits(result.failed)} خطا`,
            '',
          ];
          await fetch(`${BALE_API}/bot${m.baleToken}/sendMessage`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ chat_id: m.baleChatId, text: [...head, ...baleLines].join('\n').slice(0, 3800) }),
            signal: AbortSignal.timeout(15_000),
          });
        }
      } catch (e) {
        console.error('auto-reprice bale notify failed:', e);
      }
    }
    result.note = `${result.updated} کارت به‌روزرسانی و ${result.confirmed} کارت تأیید شد`;
  }

  await setSetting('autoRepriceLastDate', todayStr());
  await setSetting('autoRepriceLastResult', JSON.stringify(result).slice(0, 20000));
  return result;
}

/** آیا الان زمان اجراست؟ (ساعت تنظیم‌شده رسیده و امروز اجرا نشده) */
async function isDue(cfg: AutoRepriceConfig): Promise<boolean> {
  if (!cfg.enabled) return false;
  if (cfg.lastDate === todayStr()) return false;
  return new Date().getHours() === cfg.hour;
}

/** تیک زمان‌بند — با فاصله ۵ دقیقه فراخوانی می‌شود */
async function tick(): Promise<void> {
  try {
    const cfg = await getAutoRepriceConfig();
    if (await isDue(cfg)) {
      console.log(`[auto-reprice] شروع اجرای شبانه در ساعت ${new Date().getHours()}`);
      await runAutoRepriceOnce('schedule');
      console.log('[auto-reprice] اجرای شبانه کامل شد');
    }
  } catch (e) {
    // خطاهای گذرای DB هنگام بوت سرور — تیک بعدی دوباره تلاش می‌کند
    console.error('[auto-reprice] tick error:', e instanceof Error ? e.message : e);
  }
}

const SCHED_KEY = Symbol.for('cardmaker.autoRepriceScheduler');

/** ثبت تیک هر ۵ دقیقه — idempotent (در HMR/چندبار فراخوانی دوباره ساخته نمی‌شود) */
export function startAutoRepriceScheduler(): void {
  const g = globalThis as unknown as Record<symbol, unknown>;
  if (g[SCHED_KEY]) return;
  g[SCHED_KEY] = true;
  setInterval(() => void tick(), 5 * 60 * 1000);
  // یک تیک اولیه با تأخیر — اجازه بوت کامل سرور و DB
  setTimeout(() => void tick(), 60 * 1000);
  console.log('[auto-reprice] scheduler registered (tick every 5 min)');
}
