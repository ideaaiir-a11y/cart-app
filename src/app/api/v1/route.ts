// GET /api/v1 — نمای کلی وب‌سرویس عمومی (بدون نیاز به کلید)
import { V1_CORS_HEADERS } from '@/lib/api-auth';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { status: 204, headers: V1_CORS_HEADERS });
}

export async function GET() {
  return Response.json(
    {
      ok: true,
      name: 'کارت‌ساز هوشمند محصول — API v1',
      auth: 'هدر Authorization: Bearer <apiKey> یا پارامتر ?apiKey= یا هدر x-api-key',
      keyManagement: { get: 'GET /api/apikey', regenerate: 'POST /api/apikey' },
      endpoints: [
        { method: 'GET', path: '/api/v1/health', desc: 'بررسی سلامت (بدون کلید)' },
        { method: 'GET', path: '/api/v1/products?q=&jobId=&limit=', desc: 'فهرست کارت‌های محصول' },
        { method: 'GET', path: '/api/v1/products/{id}', desc: 'جزئیات کامل یک کارت' },
        {
          method: 'POST',
          path: '/api/v1/generate',
          desc: 'ساخت پروسه جدید — بدنه: {"input":"نام یا لینک محصول"} (تا ۱۲ مورد، آرایه هم پذیرفته می‌شود)',
        },
        { method: 'GET', path: '/api/v1/jobs/{id}', desc: 'وضعیت پروسه و کارت‌ها (poll)' },
        {
          method: 'POST',
          path: '/api/v1/chat',
          desc: 'دستیار ویرایشگر — بدنه: {"message":"...","cardId":"اختیاری"}',
        },
      ],
      time: new Date().toISOString(),
    },
    { headers: V1_CORS_HEADERS },
  );
}
