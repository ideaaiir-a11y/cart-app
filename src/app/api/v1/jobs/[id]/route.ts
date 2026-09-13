// GET /api/v1/jobs/[id] — وضعیت پروسه و کارت‌های آن (وب‌سرویس عمومی با کلید)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, v1Error, V1_CORS_HEADERS } from '@/lib/api-auth';
import type { PriceSource, PriceHistoryRow, SpecItem, StageInfo, VerifyIssue } from '@/lib/types';

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
    const job = await db.job.findUnique({ where: { id }, include: { cards: true } });
    if (!job) return v1Error('پروسه یافت نشد', 404);

    const stages: StageInfo[] = jsonArr<StageInfo>(job.stagesLog, []);
    const done = job.cards.filter((c) => c.status === 'done').length;

    return Response.json(
      {
        ok: true,
        job: {
          id: job.id,
          status: job.status,
          currentStage: job.currentStage,
          error: job.error,
          watermarkText: job.watermarkText,
          watermarkMode: job.watermarkMode,
          cardTheme: job.cardTheme,
          stages: stages.map((s) => ({
            key: s.key,
            title: s.title,
            status: s.status,
            logs: (s.logs || []).slice(-6),
          })),
          progress: { cardsTotal: job.cards.length, cardsDone: done },
          cards: job.cards.map((c) => ({
            id: c.id,
            name: c.name || c.rawInput,
            nameFa: c.nameFa,
            nameEn: c.nameEn,
            status: c.status,
            error: c.error,
            price: c.price,
            priceValue: c.priceValue,
            priceSource: jsonArr<PriceSource>(c.priceSource, []),
            priceHistory: jsonArr<PriceHistoryRow>(c.priceHistory, []),
            specs: jsonArr<SpecItem>(c.specs, []),
            issues: jsonArr<VerifyIssue>(c.issues, []),
            link: c.link,
            hasImage: !!c.imageUrl,
            tags: jsonArr<string>(c.tags, []),
            theme: c.theme || job.cardTheme,
            hasEn: !!c.htmlEn,
            shareUrl: `/api/cards/${c.id}/share`,
            downloadUrl: c.status === 'done' ? `/api/jobs/${job.id}/download/${c.id}` : '',
            createdAt: c.createdAt.toISOString(),
          })),
          createdAt: job.createdAt.toISOString(),
        },
      },
      { headers: V1_CORS_HEADERS },
    );
  } catch (e) {
    return v1Error(e instanceof Error ? e.message : 'خطا در وضعیت پروسه', 500);
  }
}
