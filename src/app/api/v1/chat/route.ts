// POST /api/v1/chat — دستیار ویرایشگر از طریق وب‌سرویس عمومی (با کلید + CORS)
// بدنه: { message: string, sessionId?, cardId? }
import { NextRequest } from 'next/server';
import { checkApiAuth, v1Error, V1_CORS_HEADERS } from '@/lib/api-auth';
import { runAssistantChat } from '@/lib/assistant-core';

export const runtime = 'nodejs';
export const maxDuration = 120;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: V1_CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const auth = await checkApiAuth(req);
  if (!auth.ok) return v1Error(auth.error, auth.status);
  try {
    const body = (await req.json().catch(() => ({}))) as {
      message?: string;
      sessionId?: string;
      cardId?: string;
    };
    const result = await runAssistantChat(body);
    if (!result.ok) {
      return v1Error(result.error || 'خطای دستیار', result.status || 500);
    }
    return Response.json(
      {
        ok: true,
        reply: result.reply,
        applied: result.applied,
        via: result.via,
        card: result.card,
      },
      { headers: V1_CORS_HEADERS },
    );
  } catch (e) {
    return v1Error(e instanceof Error ? e.message : 'خطای ناشناخته دستیار', 500);
  }
}
