// GET /api/v1/products — فهرست کارت‌های محصول (وب‌سرویس عمومی با کلید)
// پارامترها: q (جستجو)، jobId، limit (۱ تا ۱۰۰، پیش‌فرض ۳۰)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, v1Error, V1_CORS_HEADERS } from '@/lib/api-auth';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { status: 204, headers: V1_CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const auth = await checkApiAuth(req);
  if (!auth.ok) return v1Error(auth.error, auth.status);
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const jobId = (url.searchParams.get('jobId') || '').trim().slice(0, 40);
    const limitRaw = Math.round(Number(url.searchParams.get('limit') || 30));
    const limit = isFinite(limitRaw) && limitRaw > 0 ? Math.min(100, limitRaw) : 30;

    const cards = await db.card.findMany({
      where: {
        ...(jobId ? { jobId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { nameFa: { contains: q } },
                { nameEn: { contains: q } },
                { rawInput: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        jobId: true,
        name: true,
        nameFa: true,
        nameEn: true,
        description: true,
        price: true,
        priceValue: true,
        link: true,
        imageUrl: true,
        specs: true,
        tags: true,
        status: true,
        theme: true,
        htmlEn: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return Response.json(
      {
        ok: true,
        count: cards.length,
        products: cards.map((c) => {
          let specs: { key: string; value: string }[] = [];
          try {
            specs = JSON.parse(c.specs || '[]');
          } catch {
            /* ignore */
          }
          let tags: string[] = [];
          try {
            tags = JSON.parse(c.tags || '[]');
          } catch {
            /* ignore */
          }
          return {
            id: c.id,
            jobId: c.jobId,
            name: c.name,
            nameFa: c.nameFa,
            nameEn: c.nameEn,
            description: c.description.slice(0, 600),
            price: c.price,
            priceValue: c.priceValue,
            link: c.link,
            imageUrl: c.imageUrl.startsWith('data:') ? '' : c.imageUrl,
            hasImage: !!c.imageUrl,
            specs,
            tags,
            status: c.status,
            theme: c.theme,
            hasEn: !!c.htmlEn,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          };
        }),
      },
      { headers: V1_CORS_HEADERS },
    );
  } catch (e) {
    return v1Error(e instanceof Error ? e.message : 'خطا در فهرست محصولات', 500);
  }
}
