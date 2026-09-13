// GET /api/v1/products/[id] — جزئیات کامل یک کارت محصول (وب‌سرویس عمومی با کلید)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, v1Error, V1_CORS_HEADERS } from '@/lib/api-auth';
import type { PriceHistoryRow, PriceSource, SpecItem, VerifyIssue } from '@/lib/types';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { status: 204, headers: V1_CORS_HEADERS });
}

function jsonArr<T>(raw: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await checkApiAuth(req);
  if (!auth.ok) return v1Error(auth.error, auth.status);
  try {
    const { id } = await ctx.params;
    const c = await db.card.findUnique({
      where: { id },
      include: {
        job: {
          select: { id: true, watermarkText: true, cardTheme: true, status: true, createdAt: true },
        },
      },
    });
    if (!c) return v1Error('محصول یافت نشد', 404);

    const priceSource = jsonArr<PriceSource>(c.priceSource, []);
    const priceHistory = jsonArr<PriceHistoryRow>(c.priceHistory, []);
    const specs = jsonArr<SpecItem>(c.specs, []);
    const issues = jsonArr<VerifyIssue>(c.issues, []);
    let tags: string[] = [];
    try {
      tags = JSON.parse(c.tags || '[]');
    } catch {
      /* ignore */
    }

    return Response.json(
      {
        ok: true,
        product: {
          id: c.id,
          jobId: c.jobId,
          job: {
            id: c.job.id,
            watermarkText: c.job.watermarkText,
            cardTheme: c.job.cardTheme,
            status: c.job.status,
            createdAt: c.job.createdAt.toISOString(),
          },
          name: c.name,
          nameFa: c.nameFa,
          nameEn: c.nameEn,
          description: c.description,
          usage: c.usage,
          descriptionEn: c.descriptionEn,
          usageEn: c.usageEn,
          price: c.price,
          priceValue: c.priceValue,
          priceSource,
          priceHistory,
          link: c.link,
          imageUrl: c.imageUrl.startsWith('data:') ? '' : c.imageUrl,
          hasEmbeddedImage: c.imageUrl.startsWith('data:'),
          specs,
          specsEn: jsonArr<SpecItem>(c.specsEn, []),
          tags,
          issues,
          status: c.status,
          theme: c.theme,
          hasEn: !!c.htmlEn,
          rawInput: c.rawInput,
          shareUrl: `/api/cards/${c.id}/share`,
          downloadUrl: `/api/jobs/${c.jobId}/download/${c.id}`,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        },
      },
      { headers: V1_CORS_HEADERS },
    );
  } catch (e) {
    return v1Error(e instanceof Error ? e.message : 'خطا در دریافت محصول', 500);
  }
}
