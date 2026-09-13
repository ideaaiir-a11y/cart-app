// POST /api/assistant/chat — چت‌بات ویرایشگر (دستیار داخلی یا خارجی apikey/baseurl)
import { NextRequest, NextResponse } from 'next/server';
import { runAssistantChat, type AssistantChatPayload } from '@/lib/assistant-core';

export const runtime = 'nodejs';
export const maxDuration = 120;

// هدرهای CORS برای استفاده ویجت embed در سایت‌های خارجی
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AssistantChatPayload;
    const result = await runAssistantChat(body);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'خطای دستیار' },
        { status: result.status || 500, headers: CORS_HEADERS },
      );
    }
    return NextResponse.json(
      { ok: true, reply: result.reply, applied: result.applied, via: result.via, card: result.card },
      { headers: CORS_HEADERS },
    );
  } catch (e) {
    console.error('assistant error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'خطای ناشناخته دستیار' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
