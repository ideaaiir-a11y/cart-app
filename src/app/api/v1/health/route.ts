// GET /api/v1/health — بررسی سلامت وب‌سرویس عمومی (بدون نیاز به کلید)
import { V1_CORS_HEADERS } from '@/lib/api-auth';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { status: 204, headers: V1_CORS_HEADERS });
}

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: 'product-card-maker',
      name: 'کارت‌ساز هوشمند محصول',
      version: '1.0',
      docs: '/api/v1',
      time: new Date().toISOString(),
    },
    { headers: V1_CORS_HEADERS },
  );
}
