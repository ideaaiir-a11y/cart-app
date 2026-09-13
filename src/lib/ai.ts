// پوشش (Wrapper) قابلیت‌های هوش مصنوعی — فقط سمت سرور
import ZAI from 'z-ai-web-dev-sdk';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, readFile, rm } from 'fs/promises';

export interface WebResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  rank: number;
  date?: string;
}

let _zai: ZAI | null = null;
export async function zai(): Promise<ZAI> {
  if (!_zai) _zai = await ZAI.create();
  return _zai;
}

/** جستجوی وب — برای نام‌گذاری و قیمت‌گذاری */
export async function webSearch(query: string, num = 10, retries = 2): Promise<WebResult[]> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const client = await zai();
      const res = (await client.functions.invoke('web_search', { query, num })) as WebResult[];
      if (Array.isArray(res)) return res;
      throw new Error('پاسخ جستجو آرایه نبود');
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  console.error('webSearch failed:', lastErr);
  return [];
}

/** گفتگو با مدل زبانی */
export async function llm(
  system: string,
  user: string,
  opts?: { thinking?: boolean }
): Promise<string> {
  const client = await zai();
  const completion = await client.chat.completions.create({
    messages: [
      { role: 'assistant', content: system },
      { role: 'user', content: user },
    ],
    thinking: { type: opts?.thinking ? 'enabled' : 'disabled' },
  });
  return completion.choices[0]?.message?.content ?? '';
}

export interface ImageSearchHit {
  original_url: string;
  caption?: string;
  source?: string;
  original_width?: string;
  original_height?: string;
}

/**
 * جستجوی تصویر — از طریق CLI رسمی `z-ai image-search`
 * (تنها مسیر پشتیبانی‌شده سرویس تصویر)
 */
export async function imageSearch(
  query: string,
  count = 6,
  timeoutMs = 120_000
): Promise<ImageSearchHit[]> {
  const dir = await mkdtemp(join(tmpdir(), 'imgsearch-'));
  const out = join(dir, 'out.json');
  const args = ['image-search', '--query', query, '--count', String(count), '--gl', 'us', '--output', out];
  try {
    const proc = spawn('z-ai', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += String(d)));
    const code = await new Promise<number>((resolve, reject) => {
      const t = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('timeout image-search'));
      }, timeoutMs);
      proc.on('error', (e) => {
        clearTimeout(t);
        reject(e);
      });
      proc.on('exit', (c) => {
        clearTimeout(t);
        resolve(c ?? 0);
      });
    });
    if (code !== 0) throw new Error(stderr || `exit ${code}`);
    const raw = await readFile(out, 'utf-8');
    const json = JSON.parse(raw);
    if (json?.success && Array.isArray(json.results)) return json.results as ImageSearchHit[];
    return [];
  } catch (e) {
    console.error('imageSearch failed:', e);
    return [];
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** استخراج JSON از پاسخ مدل (حتی اگر در ```json``` پیچیده شده باشد) */
export function parseJsonLoose<T>(text: string): T | null {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const start = Math.min(
    ...['{', '['].map((c) => {
      const i = candidate.indexOf(c);
      return i === -1 ? Infinity : i;
    })
  );
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  if (!isFinite(start) || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** دریافت بافر یک تصویر از اینترنت با کنترل نوع محتوا */
export async function fetchImage(url: string, timeoutMs = 20_000): Promise<{ buf: Buffer; contentType: string } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; CardBot/1.0)' } });
    clearTimeout(t);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null;
    return { buf, contentType: ct };
  } catch {
    return null;
  }
}
