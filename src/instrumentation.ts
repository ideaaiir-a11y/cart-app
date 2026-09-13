// بوت سرور — ثبت زمان‌بند خودکار «قیمت روز»
// در هر بوت (و HMR) فقط یک‌بار ثبت می‌شود (گارد Symbol در خود ماژول)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startAutoRepriceScheduler } = await import('@/lib/auto-reprice');
      startAutoRepriceScheduler();
    } catch (e) {
      console.error('[instrumentation] auto-reprice scheduler failed to start:', e);
    }
  }
}
