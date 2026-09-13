// GET /api/embed/widget.js — اسکریپت ویجت چت برای جاسازی در هر وب‌سایت خارجی
// استفاده: <script src="https://DOMAIN/api/embed/widget.js" data-title="پشتیبانی" data-pos="left"></script>
// پارامترها: data-title، data-welcome، data-pos (left|right)، data-accent (رنگ hex)، data-origin (سرور API)
import { NextRequest, NextResponse } from 'next/server';
import { WIDGET_JS } from '@/lib/embed-widget-source';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = url.searchParams;
  let js = WIDGET_JS;

  // پارامترهای query مانند data-* عمل می‌کنند (برحسب اولویت: query > data-attr > پیش‌فرض)
  const overrides: string[] = [];
  const title = params.get('title');
  const welcome = params.get('welcome');
  const pos = params.get('pos');
  const accent = params.get('accent');
  if (title) overrides.push(`script.setAttribute('data-title', ${JSON.stringify(title)});`);
  if (welcome) overrides.push(`script.setAttribute('data-welcome', ${JSON.stringify(welcome)});`);
  if (pos === 'left' || pos === 'right') overrides.push(`script.setAttribute('data-pos', '${pos}');`);
  if (accent && /^#[0-9a-fA-F]{3,8}$/.test(accent)) overrides.push(`script.setAttribute('data-accent', '${accent}');`);

  if (overrides.length) {
    js = js.replace(
      "if (!script) return;",
      `if (!script) return;\n  ${overrides.join('\n  ')}`,
    );
  }

  return new NextResponse(js, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=300',
    },
  });
}
