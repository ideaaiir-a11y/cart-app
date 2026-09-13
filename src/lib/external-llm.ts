// فراخوانی دستیار خارجی سازگار با OpenAI (apikey/baseurl)
// مشترک بین چت‌بات ویرایشگر، تست اتصال و وب‌سرویس عمومی

export interface ChatMessage {
  role: string;
  content: string;
}

export async function callExternal(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  timeoutMs = 60_000,
): Promise<string> {
  const url = baseUrl
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/, '');
  const endpoint = `${url}/chat/completions`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ model: model || 'gpt-4o-mini', messages, temperature: 0.6 }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`پاسخ ${res.status} از سرویس خارجی: ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('پاسخ خالی از سرویس خارجی');
    return content;
  } finally {
    clearTimeout(t);
  }
}

/** تنظیمات دستیار خارجی از دیتابیس */
export async function getExternalAssistantConfig(): Promise<{
  useExternal: boolean;
  url: string;
  key: string;
  model: string;
}> {
  const { db } = await import('@/lib/db');
  const rows = await db.setting.findMany({
    where: { key: { in: ['useExternal', 'assistantUrl', 'assistantKey', 'assistantModel'] } },
  });
  const map = Object.fromEntries(rows.map((s) => [s.key, s.value]));
  return {
    useExternal: map.useExternal === '1' && !!map.assistantUrl,
    url: map.assistantUrl || '',
    key: map.assistantKey || '',
    model: map.assistantModel || '',
  };
}
