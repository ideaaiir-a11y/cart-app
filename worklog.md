# کارتابل هوشمند محصول — Worklog

پروژه: وب‌اپ فارسی RTL «ساخت خودکار کارت محصول» (خروجی مطابق نمونه upload/isadora.html)

## قرارداد API (ثابت — فرانت و بک به این پایبند باشند)

- `POST /api/jobs` — multipart: `inputs`(JSON string[]), `files`(File[]), `watermarkText`, `watermarkMode`(text|logo), `watermarkPos`, `watermarkLogo`(dataURL string), `useExternal`(0/1), `assistantUrl`, `assistantKey`, `assistantModel` → `{ok, jobId}`
- `POST /api/jobs/{id}/run` → `{ok}` (پایپ‌لاین در پس‌زمینه اجرا می‌شود)
- `GET /api/jobs/{id}` → `{ok, job:{id,status,currentStage,stages:[{key,title,status,logs[],startedAt,endedAt}],error,watermarkText,cards:[CardData]}}` — برای polling هر ۲ ثانیه
- `GET /api/jobs/{id}/download` → ZIP همه کارت‌های done
- `GET /api/jobs/{id}/download/{cardId}` → فایل HTML تکی
- `DELETE /api/jobs/{id}` → حذف job
- `POST /api/cards/{cardId}` — JSON: `{name?, description?, usage?, price? (عدد تومان), specs?}` → `{ok, card}` (HTML دوباره رندر می‌شود)
- `POST /api/assistant/chat` — JSON: `{sessionId, cardId?, message}` → `{ok, reply, applied: bool, card?}` — چت‌بات ویرایشگر
- `GET /api/settings` → `{ok, settings:{watermarkText, watermarkMode, watermarkPos, assistantUrl, assistantKey, assistantModel, useExternal, baleTokenSet}}`
- `POST /api/settings` — JSON همان فیلدها → `{ok}`
- `POST /api/bale/setup` — JSON `{token}` → تست getMe + setWebhook روی tapi.bale.ai → `{ok, info?, error?}`
- `POST /api/bale/hook` — وب‌هوک دریافت آپدیت بله (پیام → پاسخ LLM → sendMessage + لاگ) → `{ok}`
- `GET /api/bale/status` → `{ok, tokenSet, lastInfo?, chatSet, notify}`
- `GET /api/bale/logs?limit=30` → `{ok, logs:[{id,direction,chatId,userName,text,ok,error,createdAt}]}` — آخرین پیام‌های ربات
- `DELETE /api/bale/logs` → `{ok}` — پاک کردن همه لاگ‌ها
- `POST /api/bale/test` — JSON `{text?}` → ارسال پیام آزمایشی به چت ثبت‌شده + لاگ → `{ok}` یا خطای API بله
- `POST /api/jobs/bulk-delete` — JSON `{ids:string[]}` → `{ok, deleted}` (کارت‌ها Cascade)
- `POST /api/jobs/{id}/rerun` → ریست مراحل/کارت‌ها + اجرای مجدد پایپ‌لاین در پس‌زمینه → `{ok}`
- `GET /api/cards/{cardId}/share` → صفحه HTML عمومی کارت + متاتگ og/twitter + JSON-LD Product + نوار برند (text/html)
- `GET /api/cards/{cardId}/qr` → تصویر PNG کد QR لینک اشتراک (هدر x-share-url)
- `POST /api/cards/{cardId}/translate` → ترجمه محتوا به انگلیسی با LLM + ذخیره descriptionEn/usageEn/specsEn/nameEn + رندر htmlEn چپ‌به‌راست → `{ok, card:{id,nameEn,descriptionEn,usageEn,specsEn,htmlEn}}`
- `GET /api/jobs/{id}/download/{cardId}?lang=en` → فایل HTML نسخه انگلیسی (اگر htmlEn خالی باشد ۴۰۹ با پیام فارسی)
- `GET /api/jobs/{id}/download` → ZIP حالا شامل «-en.html» برای کارت‌های ترجمه‌شده هم هست
- `GET /api/jobs` → هر job حالا `hasEn` هم دارد (برای badge EN در UI)
- هر card در `GET /api/jobs/{id}` → `hasEn: boolean` (وجود نسخه انگلیسی)
- `GET /api/cards/{cardId}/share?print=1` → حالت چاپ/PDF: استایل A4 با print-color-adjust + پنهان‌کردن نوار برند در print + اسکریپت auto window.print + pill راهنمای سبز روی صفحه (cache-control: no-store در حالت چاپ)
- `POST /api/cards/{cardId}/reprice` → به‌روزرسانی قیمت کارت با جستجوی تازه → میانه → حاشیه سود/رُند (تنظیمات فعلی کاربر؛ fallback به مقادیر job) → ذخیره + رندر مجدد html (+ htmlEn اگر موجود، بدون فراخوانی مجدد مدل) → `{ok, found, oldPrice, newPrice, marketPrice, appliedMarkup, appliedRound, sourcesCount, card}`
- تنظیمات قیمت‌گذاری: `priceMarkup` (۰ تا ۹۰ درصد) و `priceRound` (۰|۱۰۰۰|۵۰۰۰|۱۰۰۰۰) در GET/POST /api/settings (اعتبارسنجی سرور) + ستون‌های `Job.priceMarkup`/`Job.priceRound` (snapshot هنگام ساخت job از Setting سراسری — در POST /api/jobs)
- `src/lib/pricing.ts` — applyJobPrice(base, markup, round) + sanitizeMarkup/sanitizeRound + PRICE_ROUND_OPTIONS (مشترک بین پایپ‌لاین/reprice/محاسبه نمونه تنظیمات)
- سخت‌سازی DELETE /api/jobs/{id}: retry سه‌باره روی خطای گذرای SQLite + P2025 → `{ok:true, alreadyGone:true}`

CardData = `{id, rawInput, inputType, name, nameFa, nameEn, description, usage, price, priceValue, priceSource[], link, imageUrl, specs[], issues[], status, error}` + `hasEn` (در پاسخ jobs/{id})

## Template کارت خروجی
دقیقاً مطابق upload/isadora.html (فونت Vazirmatn، کارت 480px، تصویر مربع base64، قیمت سبز، جدول مشخصات) + بخش «روش مصرف» زرد + دکمه لینک مرجع + فوتر برند کاربر. رندر: `src/lib/card-template.ts`

## ماژول‌های backend آماده
- `src/lib/types.ts` — قرارداد و تعریف ۶ مرحله
- `src/lib/fa.ts` — ارقام فارسی، استخراج/میانه قیمت
- `src/lib/card-template.ts` — رندر HTML نهایی
- `src/lib/ai.ts` — webSearch/llm/imageSearch(CLI z-ai)/fetchImage/parseJsonLoose
- `src/lib/watermark.ts` — sharp + SVG متن فارسی (Vazirmatn نصب شد در ~/.fonts) یا لوگو، مربع 900×900
- `src/lib/parse-input.ts` — parseLines/parseFiles(html/zip/img/txt)/parseHtmlCard/mergeSeeds
- `src/lib/pipeline.ts` — runPipeline(jobId): ۶ مرحله + لاگ زنده در stagesLog
- prisma schema: Job/Card/Setting/ChatMessage — db push شد

## UI زبون مشترک
- تک‌صفحه `/` — فارسی RTL، فونت Vazirmatn، بدون رنگ آبی/نیلی — پالت: سبز emerald + کهربایی amber روی زمینه روشن (bg #f8fafc)
- اجزای صفحه: هدر چسبان → بخش ورودی (متن چندخطی + drag&drop فایل + لینک تصاویر) → تنظیمات (واترمارک/دستیار خارجی apikey+baseurl/ربات بله) → دکمه بزرگ «شروع پردازش» → نمایش ۶ مرحله با لاگ زنده (max-h scroll) → گالری خروجی با پیش‌نمایش iframe مقیاس‌دار + دانلود تکی/ZIP → چت‌بات ویرایشگر شناور
- فوتر چسبان پایین (min-h-screen flex flex-col + mt-auto)
---
Task ID: 2-b
Agent: frontend-styling-expert
Task: ساخت فرانت‌اند کامل تک‌صفحه‌ای RTL فارسی «کارت‌ساز هوشمند محصول» (Next.js 16 App Router) مطابق قرارداد API و زبون طراحی مشترک

Work Log:
- `src/app/layout.tsx` — بازنویسی: dir="rtl" lang="fa"، فونت Vazirmatn از Google Fonts (wght@300..800) با preconnect، ThemeProvider (next-themes, attribute="class", defaultTheme="light")، Toaster sonner با richColors position="bottom-left"، متادیتای فارسی، body با min-h-screen flex flex-col
- `src/app/globals.css` — پالت emerald/amber روی زمینه روشن (بدون آبی/نیلی) در :root و .dark، فونت Vazirmatn به‌عنوان font-sans، ::selection سبز، اسکرول‌بار باریک سفارشی `.scrollbar-thin` (webkit + scrollbar-width) برای لیست‌های بلند
- `src/components/shared.tsx` — انواع مشترک فرانت (CardWithHtml، JobData، WatermarkConfig، AssistantConfig)، آیکون‌های ۶ مرحله، متای وضعیت مرحله/job (badgeها)، WATERMARK_POSITIONS، ابزارها: faNum (اعداد فارسی)، faFileSize، fileIcon، apiJson (fetch امن با پیام خطای فارسی)، truthy برای useExternal
- `src/components/theme-provider.tsx` + `theme-toggle.tsx` — wrapper next-themes و دکمه Sun/Moon با aria-label
- `src/components/app-header.tsx` — هدر چسبان شیشه‌ای (backdrop-blur) با آیکون Sparkles، دکمه «تنظیمات» (اسکرول به #settings) و سوییچ حالت تیره
- `src/components/hero-strip.tsx` — عنوان + توضیح ۶ گام + ۶ چیپ مرحله با انیمیشن stagger (framer-motion) و tooltip عنوان مرحله
- `src/components/input-section.tsx` — Textarea چندخطی با placeholder نمونه (ایزادورا…)، شمارنده ورودی، Drag&Drop + input file (accept html/zip/img/txt) با badge قابل‌حذف و آیکون نوع و حجم فارسی، لیست پویا «لینک مستقیم تصاویر» با اعتبارسنجی http(s)
- `src/components/settings-section.tsx` — Card «تنظیمات» با ۳ تب: ۱) واترمارک: Switch متن/لوگو، Input متن + Select موقعیت (۶ گزینه)، آپلود لوگو با پیش‌نمایش dataURL، راهنمای زنده ۲) دستیار خارجی: Switch + Base URL/Key(password)/Model + ذخیره → POST /api/settings ۳) ربات بله: Input توکن (ماسک با چشم) + «ثبت وب‌هوک و اتصال» → POST /api/bale/setup؛ GET /api/bale/status در mount؛ alert سبز/قرمز با username ربات
- `src/components/pipeline-panel.tsx` — «پروسه اجرا»: ۶ ردیف مرحله (آیکون + عنوان + badge وضعیت فارسی + نوار پیشرفت RTL سفارشی)، جعبه لاگ ترمینالی فقط برای مرحله فعال/خطا (max-h-48، font-mono، rtl، autoscroll، scrollbar-thin) با AnimatePresence، درصد کل پیشرفت با اعداد فارسی، alert خطای job
- `src/components/output-gallery.tsx` — «خروجی‌ها»: گرید واکنش‌گرا (md:2، xl:3)، پیش‌نمایش iframe مقیاس‌دار 0.55 (480px کارت، sandbox، pointer-events-none)، badge قیمت/نام لاتین، دکمه‌های دانلود HTML (/api/jobs/{id}/download/{cardId})، کپی HTML (clipboard)، ویرایش هوشمند (باز کردن چت با کارت انتخابی)، Dialog «مشاهده کامل» با پیش‌نمایش 0.85 + badgeهای راستی‌آزمایی (نام/تصویر/لینک/قیمت با ✓/✗/اصلاح شد + tooltip جزئیات) + مشخصات + منابع قیمت + روش مصرف، دکمه «دانلود ZIP همه کارت‌ها»، اسکلتون لودینگ هنگام اجرا
- `src/components/chat-widget.tsx` — دکمه شناور round emerald (bottom-left, size-14) + پنل 380×520: سربرگ سبز با کارت هدف (قابل لغو)، لیست پیام (کاربر/دستیار)، ۴ چیپ پیشنهاد سریع، ورودی + ارسال با Enter، POST /api/assistant/chat با sessionId (crypto.randomUUID در localStorage) و cardId؛ applied → badge «روی کارت اعمال شد ✓» + دکمه «به‌روزرسانی خروجی‌ها»
- `src/app/page.tsx` — orchestrator کلاینت: state خالص React، grid lg:grid-cols-3 (ورودی col-span-2)، دکمه بزرگ «شروع پردازش» با Rocket/Loader2 (غیرفعال بدون ورودی یا حین اجرا)، ساخت FormData طبق قرارداد POST /api/jobs → POST /api/jobs/{id}/run → polling هر ۲ ثانیه GET /api/jobs/{id} تا status نهایی، ذخیره/بازیابی jobId از localStorage (restore در reload)، پیش‌بارگذاری GET /api/settings، همگام‌سازی کارت انتخابی چت با داده تازه، همه fetchها relative (/api/...) و خطاها با sonner
- `src/components/site-footer.tsx` + body — فوتر چسبان پایین (mt-auto) با متن «کارت‌ساز هوشمند محصول — پردازش خودکار نام، قیمت، تصویر و محتوا» + «ساخته‌شده با ❤ برای فروشندگان فارسی‌زبان»
- رعایت کیفیت: فاصله‌گذاری p-4/p-6 و gap-4/6، rounded-xl/2xl، hover روی همه دکمه/کارت‌ها، framer-motion برای ظاهر پنل/مراحل/کارت‌ها، aria-label روی همه دکمه‌های آیکونی، اعداد فارسی (fa-IR)، حداقل h-10/h-11 برای دکمه‌های اصلی
- `bun run lint` — نهایی: 0 error / 0 warning (رفع دو هشدار اولیه: no-page-custom-font با disable directive و directive بلااستفاده)

Stage Summary:
- ۱۲ فایل ساختهشده/بهروزرسانی شد: layout.tsx، globals.css، page.tsx + ۹ کامپوننت (shared، theme-provider، theme-toggle، app-header، site-footer، hero-strip، input-section، settings-section، pipeline-panel، output-gallery، chat-widget)
- صفحه کامل: هدر چسبان → هیرو ۶ گام → ورودی (متن/فایل/لینک تصویر) → تنظیمات ۳ تب → دکمه شروع → پروسه ۶ مرحله با لاگ زنده → گالری خروجی با پیش‌نمایش iframe و دانلود ZIP → چت شناور ویرایشگر → فوتر چسبان
- تمام قرارداد API worklog رعایت شد (jobs/run/poll/download/settings/bale/assistant)؛ بدون URL مطلق؛ polling ۲s؛ restore با localStorage؛ dark mode با next-themes
- lint: 0 خطا / 0 هشدار — بدون تغییر در prisma، src/lib/* و src/app/api/*
---

---
Task ID: 2-a
Agent: main (Z.ai Code)
Task: Backend — pipeline engine + all API routes per contract

Work Log:
- Prisma schema (Job/Card/Setting/ChatMessage) → db push OK
- src/lib: types.ts, fa.ts (Persian digits/price extraction), card-template.ts (isadora.html clone), ai.ts (webSearch/llm/imageSearch CLI/fetchImage), watermark.ts (sharp SVG), parse-input.ts (lines/html/zip/img/txt), pipeline.ts (6 stages with live logs)
- API routes: POST /api/jobs (multipart), POST /api/jobs/[id]/run (background runPipeline), GET+DELETE /api/jobs/[id], GET /api/jobs/[id]/download (ZIP via jszip), GET /api/jobs/[id]/download/[cardId] (single HTML), POST /api/cards/[cardId] (manual edit + re-render), POST /api/assistant/chat (internal z-ai LLM OR external OpenAI-compatible apikey/baseurl; __EDITS__ protocol applies edits to card), GET/POST /api/settings, POST /api/bale/setup (getMe + setWebhook on tapi.bale.ai), GET /api/bale/status (lastInfo key), POST /api/bale/hook (receives Bale updates → LLM → sendMessage)
- Fixed: Prisma priceValue Int vs String in cards + assistant routes
- Fixed watermark SVG: removed direction attr, text-anchor middle, generous pill sizing (librsvg renders Persian via pango correctly — verified visually)
- Vazirmatn font installed to ~/.fonts for watermark rendering + copied to public/fonts

Stage Summary:
- E2E API test passed: 1-product job (Isadora mascara) done in ~60s all 6 stages; 2-product job (Dermacol SPF50 + Sinerre shampoo) done with diagonal watermark, prices from search median
- Assistant chat applies edits (price ۳۹۰٬۰۰۰ confirmed), ZIP + single HTML downloads verified

---
Task ID: 3 & 4
Agent: main (Z.ai Code)
Task: Integration + agent-browser end-to-end QA

Work Log:
- agent-browser desktop (1440×900): page renders RTL Persian, hero + 6 stage chips, two-column workspace, emerald/amber palette, sticky footer verified (min-h-screen flex-col + mt-auto)
- Golden path in UI: filled product name «ادکلن مردانه لاکوست L.12.12 بلو» + watermark «فروشگاه نمونه» → شروع پردازش → live 6-stage progress with logs → output gallery with scaled iframe preview, price badge, دانلود HTML / کپی / ویرایش هوشمند / مشاهده کامل / دانلود ZIP
- Chat widget E2E: «ویرایش هوشمند» → message → applied ✓ badge → outputs refreshed showing new price ۲,۲۲۰٬۰۰۰ + short description + روش مصرف section
- Dark mode toggle verified visually
- Mobile (iPhone 14 viewport): single column, responsive, footer pushed naturally (docH 3700, footerTop 3599)
- File upload flow: uploaded isadora.html inside ZIP → parseHtmlCard extracted title/desc/img/specs/usage → full pipeline rebuild → watermark top-left/bottom-right verified visually
- BUG FIX 1: watermark SVG Persian text clipped/disconnected → removed direction attr + middle anchor + generous pill (librsvg/pango), verified «فروشگاه نمونه» renders perfectly (corner badge + diagonal repeat)
- BUG FIX 2: Prisma priceValue Int vs String in cards/[cardId] and assistant/chat routes
- BUG FIX 3: parsedPrice early-continue skipped DB save in stagePricing → price now persists (verified ۲۹۰٬۰۰۰ تومان in DB)
- bun run lint: 0 errors / 0 warnings; tsc clean in src/

Stage Summary:
- Project is production-ready: full pipeline (upload/paste → start → 6 auto stages → download HTML/ZIP), chat editor bot, external assistant apikey/baseurl, Bale bot webhook management
- All outputs match the isadora.html reference structure with additions: روش مصرف block, reference link button, brand footer

---
Task ID: r2 (cron webDevReview round 2)
Agent: main (Z.ai Code)
Task: QA pass + ۳ قابلیت جدید + پالایش استایل

Work Log:
- QA اولیه: dev server سلامت، بدون خطای runtime جدید (matches قبلی فقط نام ستون error در لاگ prisma بود)؛ سرور یک‌بار down شده بود → restart شد
- قابلیت ۱ — ویرایشگر دستی کارت (`card-editor-dialog.tsx`): فرم کامل نام/قیمت/توضیح/روش‌مصرف/جدول مشخصات (افزودن/حذف ردیف) → POST /api/cards/{id} → بازسازی HTML + به‌روزرسانی درجای گالری (applyCardUpdate در page.tsx)؛ دکمه «تصویر تازه» داخل دیالوگ
- قابلیت ۲ — تاریخچه پروسه‌ها: GET /api/jobs (لیست ۲۰ شغل آخر با شمار کارت‌ها و نمونه نام‌ها) + `job-history.tsx` (Collapsible با badge وضعیت فارسی، تاریخ fa-IR، بازکردن/حذف، فعال highlight، انیمیشن layout)؛ بازکردن → load job + localStorage + اسکرول به پروسه؛ refresh خودکار پس از اتمام پردازش (historyKey)
- قابلیت ۳ — تازه‌سازی تصویر: POST /api/cards/[cardId]/image (جستجوی تصویر جدید + واترمارک با تنظیمات شغل + رندر مجدد)؛ تست API موفق: تصویر ۱۵۸KB → ۲۵۲KB
- پالایش استایل (hero-strip.tsx): تیتر گرادیانی emerald→amber، badge «خط تولید هوشمند ۶ مرحله‌ای»، دو لکه نور blur تزئینی، بافت نقطه‌ای ظریف، شماره‌گذاری چیپ‌های مراحل، backdrop-blur روی چیپ‌ها
- چیدمان دکمه‌های کارت خروجی: دانلود/کپی، هوشمند/دستی، مشاهده کامل (col-span-2)
- رفع: lucide `ImageRefresh` موجود نیست → `ImagePlus`
- تست مرورگر: پنل تاریخچه با داده واقعی (۱۷/۱۷ کارت، ۳ شغل) ✓، بازکردن شغل از تاریخچه ✓، دیالوگ ویرایش دستی با پیش‌پرشدن فیلدها ✓، ذخیره قیمت ۲۹۰٬۰۰۰→۳۱۵٬۰۰۰ و به‌روزرسانی زنده پیش‌نمایش ✓، toastهای فارسی ✓، موبایل OK
- lint: 0 خطا/0 هشدار؛ tsc src: 0 خطا

Stage Summary:
- سه قابلیت جدید فعال شد: ویرایشگر دستی کارت، تاریخچه پروسه‌ها (بازکردن/حذف)، تصویر تازه با واترمارک
- API جدید: GET /api/jobs، POST /api/cards/[cardId]/image — قرارداد در همین فایل ثبت شد
- پیشنهاد دور بعد: تم‌های رنگی قالب کارت (چند تم برای buildProductHtml)، خروجی JSON ساختاریافته کنار HTML، صفحه/ویجت embed عمومی برای چت‌بات (script tag)، صف پردازش همزمان چند شغل

---
Task ID: r3 (cron webDevReview round 3)
Agent: main (Z.ai Code)
Task: QA کامل با agent-browser + سه قابلیت جدید (تم رنگی کارت، خروجی JSON، ویجت embed) + پالایش استایل

Work Log:
- QA اولیه: صفحه دسکتاپ/موبایل سالم، تاریخچه و گالری و دیالوگ‌ها کار می‌کنند، بدون خطای کنسول؛ سرور یک‌بار برای بارگذاری Prisma client جدید restart شد (schema push)
- قابلیت ۱ — تم‌های رنگی قالب کارت: `src/lib/card-themes.ts` با ۶ تم کامل (زمردی/سرخابی/بنفش/طلایی/فیروزه‌ای/شبانه-تیره) شامل همه رنگ‌های بلاک‌ها (قیمت، روش مصرف، جدول، دکمه لینک، فوتر)؛ `card-template.ts` تم‌دار شد؛ فیلد `cardTheme` روی Job + فیلد `theme` (اختصاصی هر کارت) روی Card در Prisma؛ pipeline از تم job در stageBuild استفاده می‌کند؛ POST /api/cards/[cardId] پارامتر `theme` می‌پذیرد (بازرندر با تم کارت یا job)؛ API تصویر تازه هم تم را حفظ می‌کند
- UI تم: تب جدید «قالب کارت» در تنظیمات با گرید ۶ کارت تم هرکدام با پیش‌نمایش مینیاتوری رنگی + انتخاب فوری با ذخیره خودکار؛ تم‌پیکر چیپی در دیالوگ ویرایش دستی؛ badge «تم X» روی کارت‌های خروجی
- قابلیت ۲ — خروجی JSON ساختاریافته: `src/lib/card-json.ts` (CardJson: name دو‌زبانه، price با currency IRT و منابع، specs، verification، theme، image dataUrl، files)؛ دانلود تکی `GET /api/jobs/{id}/download/{cardId}?format=json`؛ ZIP حالا شامل HTML + JSON هم‌نام هر کارت + `cards.json` تجمیعی + README به‌روزشده؛ دکمه «دانلود JSON» در گالری (گرید ۲×۳) و دیالوگ مشاهده کامل
- قابلیت ۳ — ویجت embed عمومی: `src/lib/embed-widget-source.ts` (ویجت self-contained با shadow DOM، RTL، فونت وزیرمتن، پیام خوش‌آمد، چیپ‌های پیشنهادی، typing indicator، session در localStorage)؛ `GET /api/embed/widget.js` با پارامترهای query/data-attr: title/welcome/pos(left|right)/accent/#hex/origin؛ CORS کامل روی POST /api/assistant/chat (OPTIONS 204 + Access-Control-Allow-Origin: *)؛ بخش «ویجت چت برای وب‌سایت شما» در تب دستیار با snippet آماده + دکمه کپی؛ صفحه دمو `public/widget-demo.html`
- رفع باگ ۱: نشت بلوک خام `__EDITS__` در پاسخ چت هنگام نبود cardId (ویجت) — حالا همیشه از پاسخ حذف می‌شود و فقط با کارت اعمال می‌شود
- رفع باگ ۲: overrideهای query ویجت بعد از خواندن متغیرها اعمال می‌شدند → انتقال تزریق به بلافاصله بعد از یافتن script
- رفع باگ ۳: ترتیب @import فونت در shadow DOM (باید اول باشد)
- رفع باگ ۴: TS خطای `job` used-before-declaration در cards/[cardId] → card.job.cardTheme
- پالایش استایل: تایمر زنده هر مرحله پایپ‌لاین (Timer icon + مدت فارسی با ثانیه‌شمار متحرک)، badge تم روی کارت‌ها، متن ZIP جدید در توضیح خروجی‌ها
- تست‌ها: تم بنفش از تنظیمات → job جدید Ray-Ban → HTML با رنگ‌های بنفش + badge تم + قیمت ۹,۹۹۰,۰۰۰ ✓؛ تغییر تم دستی کارت به فیروزه‌ای → toast فارسی + بازرندر زنده ✓؛ JSON دانلود ساختار صحیح (specs:11, verification:4, image embedded) ✓؛ ZIP شامل ۴ فایل (html/json/cards.json/README) ✓؛ ویجت روی صفحه دمو: عنوان سفارشی «پشتیبانی فروشگاه» + گفتگوی کامل با پاسخ LLM بدون نشت __EDITS__ ✓؛ dark mode + موبایل ✓
- lint: 0 خطا/0 هشدار؛ tsc src: 0 خطا

Stage Summary:
- سه قابلیت جدید فعال و تست‌شده: ۶ تم رنگی قالب (سطح job + اختصاصی کارت)، خروجی JSON ساختاریافته (تکی + ZIP + cards.json)، ویجت چت embed عمومی با CORS
- API جدید/تغییرکرده: cardTheme در POST /api/jobs و GET/POST /api/settings؛ theme در POST /api/cards/[cardId] و GET /api/jobs/[id]؛ ?format=json در دانلود تکی؛ GET /api/embed/widget.js؛ OPTIONS /api/assistant/chat
- فایل‌های جدید: src/lib/card-themes.ts، src/lib/card-json.ts، src/lib/embed-widget-source.ts، src/app/api/embed/widget.js/route.ts، public/widget-demo.html
- پیشنهاد دور بعد: اعمال گروهی تم روی همه کارت‌های یک job با یک دکمه، صف همزمان چند job، پیش‌نمایش زنده تم در تنظیمات قبل از اجرا، چند زبانه کردن کارت خروجی (fa/en)، آمار داشبوردی (تعداد کارت‌ها/میانگین قیمت)

---
Task ID: r4 (cron webDevReview round 4)
Agent: main (Z.ai Code)
Task: QA با agent-browser + سه قابلیت جدید (اعمال گروهی تم، داشبورد آماری، پیش‌نمایش زنده تم) + پالایش استایل

Work Log:
- QA اولیه: سرور سالم (HTTP 200)، صفحه دسکتاپ بدون خطای کنسول، ۶ پروسه done در تاریخچه، گالری/تاریخچه/فوتر چسبان سالم
- قابلیت ۱ — اعمال گروهی تم: `POST /api/jobs/[id]/theme` با body `{theme}` → به‌روزرسانی cardTheme شغل + همه کارت‌ها و بازرندر کامل HTML هر کارت با تم جدید (کارت‌های ناتمام فقط تم ذخیره می‌کنند) → `{ok, theme, updated}`؛ UI: `BulkThemePopover` در سربرگ گالری خروجی (کنار دکمه ZIP) با گرید ۶ تم، اسپینر هنگام اعمال، toast فارسی «تم «X» روی N کارت اعمال شد»، سپس refetch خودکار job + بروزرسانی StatsBar
- قابلیت ۲ — داشبورد آماری: `GET /api/stats` → jobsTotal/jobsDone، cardsTotal/cardsDone، pricedCount، avgPrice/minPrice/maxPrice، themeDist (توزیع تم‌ها با swatch)، topTheme، week (۷ روز اخیر با شمار پروسه هر روز)؛ کامپوننت جدید `stats-bar.tsx`: ۵ کاشی (کارت آماده، پروسه موفق، میانگین قیمت، تم محبوب، نمودار میله‌ای ۷ روزه) با شمارنده متحرک rAF (useCountUp با easing)، هاور لکه نور، اسکلتون لودینگ، tooltip بومی نمودار + عدد فارسی بالای میله فعال؛ جای‌گیری: زیر هیرو، refresh با historyKey (پس از اتمام job و اعمال تم گروهی)
- قابلیت ۳ — پیش‌نمایش زنده تم: `GET /api/card-preview?theme=X` → HTML کارت نمونه (کرم آفتاب فارما پیور با تصویر SVG داخلی base64 — بدون نیاز به اینترنت، ۴ مشخصه، روش مصرف، لینک، برند «فروشگاه نمونه»)؛ UI در تب «قالب کارت» تنظیمات: پنل پیش‌نمایش با سربرگ chrome مانند (سه نقطه رنگی + عنوان «پیش‌نمایش زنده — تم X»)، iframe مقیاس 0.62 با پس‌زمینه تطبیقی (تیره برای تم شبانه)، کش سمت کلاینت (Map در useRef)، hover/focus روی چیپ تم → تعویض فوری پیش‌نمایش، hint راهنما
- پالایش استایل: بازطراحی WeekChart (میله‌های flex-1 با ارتفاع درصدی، ردیف برچسب روز جداست، اعداد فارسی روی میله‌ها، title بومی)، دکمه «تغییر گروهی تم» outline زمردی هماهنگ با دکمه ZIP، رفع تداخل برچسب‌های نمودار موبایل
- تست E2E با agent-browser: StatsBar با داده واقعی (۷ کارت/۶ پروسه/میانگین ۲,۱۴۳,۵۰۰/تم زمردی/نمودار هفتگی) ✓، پیش‌نمایش زنده: hover سرخابی → سربرگ و قالب تغییر فوری ✓، Popover تم گروهی → کلیک شبانه → job+card در DB به midnight تغییر کرد، پیش‌نمایش کارت تیره شد، badge «تم شبانه» ✓، بازگردانی به بنفش با همان API ✓، موبایل 390px: کاشی‌ها ۲ ستونه، نمودار full-width ✓
- نکته تست: کلیک با ref قدیمی popover ممکن است به چیپ هم‌نام تنظیمات برسد (portal) — در تست از snapshot تازه استفاده شد
- lint: 0 خطا/0 هشدار؛ tsc src: 0 خطا (خطاهای examples/skills از قبل موجود و خارج از اپ هستند)

Stage Summary:
- سه قابلیت جدید فعال و تست‌شده: اعمال گروهی تم روی همه کارت‌های پروسه، داشبورد آماری با شمارنده متحرک و نمودار هفتگی، پیش‌نمایش زنده تم در تنظیمات
- API جدید: POST /api/jobs/[id]/theme، GET /api/stats، GET /api/card-preview?theme=
- فایل‌های جدید: src/app/api/stats/route.ts، src/app/api/jobs/[id]/theme/route.ts، src/app/api/card-preview/route.ts، src/components/stats-bar.tsx
- فایل‌های تغییرکرده: output-gallery.tsx (BulkThemePopover + prop onBulkThemeApplied)، settings-section.tsx (پنل پیش‌نمایش زنده + hover sync)، page.tsx (StatsBar + wiring)
- پیشنهاد دور بعد: صف همزمان چند job، خروجی چندزبانه (fa/en) کارت، انتخاب قلم/اندازه فونت واترمارک، مرتب‌سازی/جستجو در گالری خروجی، اعلان Bale پس از اتمام هر پروسه (ارسال خلاصه کارت‌ها به ربات)

---
Task ID: r5 (cron webDevReview round 5)
Agent: main (Z.ai Code)
Task: QA با agent-browser + سه قابلیت جدید (اعلان بله، جستجو/مرتب‌سازی/CSV گالری، اندازه واترمارک + پیش‌نمایش زنده) + رفع شکاف UX

Work Log:
- QA اولیه: سرور سالم (HTTP 200)، بدون خطای کنسول در دسکتاپ/موبایل، فوتر چسبان سالم (footerBottom ≈ docH)
- قابلیت ۱ — اعلان پایان پردازش در بله: `src/lib/bale-notify.ts` جدید (rememberBaleChatId + buildJobMessage + notifyJobDone؛ هرگز خطا پرتاب نمی‌کند)؛ وب‌هوک بله حالا chat.id پیام کاربر را در Setting `baleChatId` ثبت می‌کند؛ پایان pipeline (done و error) خلاصه فارسی (مدت، برند، لیست کارت‌ها با قیمت، شمار آماده، لینک اپ با env APP_ORIGIN) به چت ثبت‌شده می‌فرستد؛ فیلدهای تنظیمات جدید: baleNotify (سوییچ) + baleChatSet در GET /api/settings و GET /api/bale/status؛ سوییچ «اعلان پایان پردازش در بله» در تب ربات بله با ذخیره فوری و راهنمای پویا
- قابلیت ۲ — جستجو/مرتب‌سازی/CSV در گالری خروجی: نوار ابزار جدید در سربرگ خروجی‌ها (فقط با بیش از ۲ کارت): جعبه جستجوی فارسی/لاتین با دکمه پاک‌کردن، Select مرتب‌سازی (پیش‌فرض/نام/ارزان‌ترین/گران‌ترین با localeCompare فارسی)، دکمه «خروجی CSV» سمت کلاینت (BOM UTF-8 + هدر فارسی: نام/نام لاتین/قیمت/لینک/تم/تعداد مشخصات/روش مصرف — سازگار با اکسل)؛ حالت خالی جستجو با دکمه بازنشانی
- قابلیت ۳ — اندازه واترمارک + پیش‌نمایش زنده: WatermarkOptions.scale جدید (small 0.75 / medium 1 / large 1.35) روی متن (قرص گوشه، مرکز، مورب) و لوگو؛ ستون watermarkSize روی Job (db push)؛ POST /api/jobs و مسیر تصویر تازه کارت از آن استفاده می‌کنند؛ Select اندازه در تب واترمارک؛ API جدید `GET /api/watermark-preview?text=&pos=&size=` (تصویر نمونه گرادیانی SVG + واترمارک واقعی sharp، کش ۱ ساعت)؛ پنل «پیش‌نمایش زنده واترمارک» با قاب مرورگر در تب واترمارک — آپدیت با debounce ۳۵۰ms روی تغییر متن/موقعیت/اندازه
- رفع شکاف UX: تنظیمات واترمارک (متن/موقعیت/اندازه) قبلاً فقط با دکمه ذخیره تب دستیار ذخیره می‌شد → حالا ذخیره خودکار با debounce ۹۰۰ms (با گارد اولین اجرا)
- تست E2E با agent-browser: پیش‌نمایش زنده واترمارک (متن «گالری عصر جدید» → پایین-راست؛ سپس مرکز + بزرگ → آپدیت فوری) ✓؛ job ۳ محصولی کامل (عینک/ساعت/هدفون) با واترمارک بزرگ مرکزی روی هر ۳ تصویر در DB و گالری ✓ (قیمت‌ها: ۹۷۰,۰۰۰ / ۶,۳۵۶,۵۰۰ / ۳,۹۹۸,۹۵۰)؛ جستجو «هدفون» → ۱ کارت ✓؛ مرتب‌سازی گران‌ترین اول → ترتیب صحیح ✓؛ دانلود CSV واقعی (cards-*.csv با BOM و ۳ ردیف) ✓؛ auto-save واترمارک (تایپ → GET /api/settings تایید) ✓؛ roundtrip baleNotify با curl ✓؛ regression چت دستیار (ok, بدون applied) ✓؛ موبایل 390px بدون overflow-X ✓
- نکته: پیش‌نمایش زنده تم و واترمارک هر دو فقط در حالت متن واترمارک فعال‌اند؛ حالت لوگو پیش‌نمایش ندارد (لوگو dataURL سشن است)
- lint: 0 خطا/0 هشدار؛ tsc src: 0 خطا (خطاهای skills/ از قبل موجود و خارج از اپ)

Stage Summary:
- سه قابلیت جدید فعال و تست‌شده: اعلان پایان پردازش در بله (ثبت خودکار chatId + سوییچ)، جستجو/مرتب‌سازی/خروجی CSV گالری، اندازه واترمارک با پیش‌نمایش زنده سمت سرور
- API جدید/تغییرکرده: GET /api/watermark-preview؛ baleNotify+baleChatSet در /api/settings و /api/bale/status؛ watermarkSize در POST /api/jobs و ستون Job
- فایل‌های جدید: src/lib/bale-notify.ts، src/app/api/watermark-preview/route.ts
- فایل‌های تغییرکرده: watermark.ts (scale+sampleImage)، pipeline.ts (scale+notify)، jobs/route.ts، settings/route.ts، bale/hook+status، cards/[cardId]/image، shared.tsx (WatermarkConfig.size + WATERMARK_SIZE_OPTIONS)، settings-section.tsx (انتخاب اندازه + پیش‌نمایش زنده + auto-save + سوییچ اعلان)، output-gallery.tsx (نوار ابزار + CSV)، page.tsx (wiring)
- پیشنهاد دور بعد: صف همزمان چند job، خروجی چندزبانه (fa/en) کارت، صفحه مدیریت وب‌هوک بله با لاگ پیام‌ها، انتخاب فونت واترمارک، حذف گروهی کارت‌ها/پروسه‌ها

---
Task ID: r6 (cron webDevReview round 6)
Agent: main (Z.ai Code)
Task: QA با agent-browser + سه قابلیت جدید (اشتراک‌گذاری کارت با QR، حذف گروهی/اجرای مجدد پروسه، لاگ پیام‌های بله + پیام آزمایشی) + پالایش استایل

Work Log:
- QA اولیه: سرور سالم (HTTP 200)، صفحه دسکتاپ بدون خطای کنسول، ۷ پروسه در تاریخچه، statsbar/galery/فوتر سالم → پروژه پایدار؛ تمرکز روی قابلیت جدید
- قابلیت ۱ — اشتراک‌گذاری کارت: `GET /api/cards/[cardId]/share` (همان HTML کارت + تزریق متاتگ‌های og/twitter + JSON-LD Product با قیمت IRR برای سئو + نوار ثابت برند «ساخته‌شده با کارت‌ساز هوشمند محصول»)؛ `GET /api/cards/[cardId]/qr` (PNG 512px با پکیج qrcode، رنگ سبز تیره، هدر x-share-url، آدرس از هدرهای درخواست)؛ دیالوگ `ShareCardDialog` در گالری (دکمه «اشتراک‌گذاری» روی هر کارت + داخل دیالوگ مشاهده کامل) شامل QR پیش‌نمایش، لینک عمومی با کپی، باز کردن صفحه، دانلود QR
- قابلیت ۲ — حذف گروهی + اجرای مجدد پروسه: `POST /api/jobs/bulk-delete` ({ids} → deleteMany Cascade)؛ `POST /api/jobs/[id]/rerun` (ریست stagesLog/status/کارت‌ها به pending + runPipeline در پس‌زمینه — داده‌های قبلی کارت به‌عنوان سرنخ حفظ می‌شود)؛ UI تاریخچه: چک‌باکس انتخاب هر ردیف، نوار قرمز حذف گروهی با انیمیشن (شمار انتخاب + لغو + دکمه حذف)، دکمه بنفش «اجرای مجدد» برای jobهای done/error دارای کارت، هایلایت قرمز ردیف انتخاب‌شده
- قابلیت ۳ — لاگ پیام‌های ربات بله: مدل `BaleLog` جدید در Prisma (direction in/out، chatId، userName، text، ok، error)؛ وب‌هوک بله حالا پیام ورودی (با نام فرستنده از from) و خروجی (وضعیت/خطای sendMessage) را لاگ می‌کند؛ `GET/DELETE /api/bale/logs`؛ `POST /api/bale/test` (ارسال پیام آزمایشی به chatId ثبت‌شده + لاگ نتیجه)؛ UI تب بله: کارت «پیام آزمایشی» با دکمه ارسال (فقط با چت ثبت‌شده)، پنل جمع‌شونده «لاگ پیام‌های ربات» با badge شمار پیام، آیکون فلش جهت‌دار ورودی/خروجی، زمان فارسی، badge «خطا» و متن خطای API بله، دکمه‌های نوسازی/پاک‌کردن لاگ
- رفع باگ ۱ ( hydration): دکمه‌های تودرتو در سربرگ پنل لاگ بله (button داخل button) → بازسازی به div + دو دکمه مجزا؛ کنسول پس از رفرش کاملاً پاک شد
- رفع باگ ۲: خطای TS `from` روی edited_message در bale/hook → تعریف from روی هر دو وریانت + interface BaleUser
- رفع باگ ۳: db.baleLog undefined بعد از db push → restart سرور برای Prisma client جدید
- پالایش استایل: هاله گرادیانی متحرک (emerald→amber blur) دور دکمه «شروع پردازش» وقتی ورودی آماده است + گرادیان دکمه؛ badge قیمت کارت خروجی با آیکون سکه و گرادیان و سایه؛ هدر گالری با گرادیان سه‌رنگ + دو لکه نور blur + عناصر relative؛ حالت خالی تاریخچه با آیکون Inbox در قاب سایه‌دار و متن راهنما؛ دکمه «اجرای مجدد» بنفش هماهنگ با آیکون تاریخچه
- تست‌های E2E با agent-browser: دیالوگ اشتراک‌گذاری (QR سبز رندر شد + لینک localhost قابل کپی + دکمه‌ها) ✓؛ صفحه share در مرورگر: کارت کامل + واترمارک + نوار برند پایین ثابت ✓؛ متاتگ‌های og در سورس ✓؛ انتخاب چک‌باکس تاریخچه → نوار قرمز حذف گروهی ✓؛ اجرای مجدد از UI → job به running رفت، اسکلتون گالری، اتمام در ۲۱ ثانیه با ۳ کارت done ✓؛ bulk-delete API با job آزمایشی: created → deleted → 404 ✓؛ تب بله با توکن QA موقت: کارت «ربات متصل است» + دکمه پیام آزمایشی (خطای واقعی API بله «Token not found» در لاگ ثبت شد) + پنل لاگ با ۵ پیام نمونه (ورودی سبز/خروجی سفید/خطا قرمز) ✓؛ پس از تست، توکن و لاگ‌های QA پاک شدند ✓؛ موبایل 390px بدون overflow-X، فوتر چسبان ✓؛ دارک‌مود همه عناصر جدید ✓؛ کنسول پاک ✓
- lint: 0 خطا/0 هشدار؛ tsc src: 0 خطا (فقط خطای قدیمی skills/ خارج از اپ)

Stage Summary:
- سه قابلیت جدید فعال و تست‌شده: اشتراک‌گذاری عمومی کارت (لینک سئو شده + QR PNG)، حذف گروهی و اجرای مجدد پروسه از تاریخچه، لاگ پیام‌های ربات بله + پیام آزمایشی
- API جدید: GET /api/cards/[cardId]/share، GET /api/cards/[cardId]/qr، POST /api/jobs/bulk-delete، POST /api/jobs/[id]/rerun، GET+DELETE /api/bale/logs، POST /api/bale/test
- فایل‌های جدید: src/app/api/cards/[cardId]/share/route.ts، src/app/api/cards/[cardId]/qr/route.ts، src/app/api/jobs/bulk-delete/route.ts، src/app/api/jobs/[id]/rerun/route.ts، src/app/api/bale/logs/route.ts، src/app/api/bale/test/route.ts
- فایل‌های تغییرکرده: prisma/schema.prisma (+BaleLog)، src/app/api/bale/hook/route.ts (لاگ in/out + userName)، src/components/output-gallery.tsx (ShareCardDialog + استایل)، src/components/job-history.tsx (انتخاب گروهی + اجرای مجدد + حالت خالی)، src/components/settings-section.tsx (BaleLogsPanel + پیام آزمایشی)، src/app/page.tsx (rerunJobFromHistory + هاله دکمه)
- پیشنهاد دور بعد: صف همزمان چند job با نمایش موازی، خروجی چندزبانه (fa/en) کارت، انتخاب فونت/وزن متن واترمارک، جستجوی سراسری کارت‌ها بین همه پروسه‌ها، برگه «کتابخانه کارت‌ها» (همه کارت‌های همه jobها در یک گرید)

---
Task ID: r7 (cron webDevReview round 7)
Agent: main (Z.ai Code)
Task: QA با agent-browser + دو قابلیت جدید (کتابخانه کارت‌ها، قلم واترمارک) + رفع دو باگ مهم (پاک‌شدن لاگ مراحل، کرش SelectItem خالی)

Work Log:
- QA اولیه: سرور سالم (HTTP 200)، کنسول دسکتاپ پاک، فوتر چسبان سالم → تمرکز روی قابلیت جدید
- رفع باگ ۱ (مهم — قدیمی): لاگ‌های همه مراحل پایپ‌لاین پس از اتمام هر مرحله پاک می‌شدند! علت: saveStage آبجکت stage را به‌صورت کامل جایگزین می‌کرد و در پایان مرحله، runPipeline همان st اولیه با logs: [] را ذخیره می‌کرد → رفع: merge در saveStage (اگر stage.logs خالی بود، لاگ‌های قبلی حفظ شود) + نکته: ماژول قدیمی در حافظه سرور مانده بود → restart سرور لازم بود تا فیکس فعال شود؛ حالا لاگ‌ها هم هنگام اجرا و هم پس از اتمام (3,2,3,2,2,3) باقی می‌مانند
- رفع باگ ۲: کرش Runtime «Select.Item must have a value prop that is not an empty string» در فیلتر تم کتابخانه (کارت‌های قدیمی theme="" دارند) → نرمال‌سازی تم خالی به emerald در API (themes grouping) + fallback در UI
- قابلیت ۱ — کتابخانه کارت‌ها (سراسری): API جدید GET /api/cards (جستجوی q در نام فارسی/لاتین/ورودی خام، فیلتر تم، مرتب‌سازی newest|oldest|name|price-asc|price-desc، صفحه‌بندی limit/offset، خروجی سبک بدون html/imageUrl + توزیع تم‌ها با groupBy)؛ API جدید DELETE /api/cards/[cardId] (حذف تک کارت)؛ کامپوننت جدید card-library.tsx: دیالوگ max-w-6xl با سربرگ گرادیانی (badge شمار کارت + لکه‌های نور)، نوار ابزار (جستجوی debounce-دار با دکمه پاک‌کردن، Select فیلتر تم با شمار، Select مرتب‌سازی، دکمه CSV)، ردیف خلاصه آماری (نمایش N از M، میانگین قیمت، قیمت‌دارها)، گرید ۳ ستونه با پیش‌نمایش تنبل iframe از صفحه عمومی کارت (scale 0.5)، نوار رنگ تم بالای هر کاشی، badge قیمت گرادیانی + چیپ تم رنگی + badge مشخصه‌ها، تاریخ شمسی، اکشن‌ها (دانلود HTML، دانلود JSON، کپی لینک عمومی، حذف با AlertDialog فارسی)؛ حالت خالی هوشمند (فیلتر vs واقعی) با دکمه بازنشانی؛ خروجی CSV کل کتابخانه (BOM + هدر فارسی)؛ دکمه ورودی «کتابخانه» در سربرگ اپ (کنار تنظیمات)
- قابلیت ۲ — قلم واترمارک: ستون watermarkFont روی Job (db push)؛ ۴ قلم فارسی نصب شد روی سرور (Vazirmatn موجود + دانلود Lalezar، Amiri Bold، Vazirmatn Black از گوگل‌فونت به ~/.fonts و public/fonts + fc-cache)؛ WATERMARK_FONTS در watermark.ts (stack+weight+label) + پارامتر font در WatermarkOptions، badge و textOverlaySvg؛ مسیر کامل: GET/POST /api/settings (watermarkFont + اعتبارسنجی)، POST /api/jobs، runPipeline → stageImages، POST /api/cards/[cardId]/image، GET /api/watermark-preview?font=؛ UI: WatermarkConfig.font در shared + WATERMARK_FONT_OPTIONS با cssFont و hint؛ تب واترمارک تنظیمات: Select قلم که نام هر قلم را با خودش رندر می‌کند (کلاس‌های font-lalezar/font-amiri/font-vazir-black در globals.css با @font-face)؛ پیش‌نمایش زنده واترمارک حالا font را هم پاس می‌دهد؛ ذخیره خودکار + saveSettings شامل font
- قابلیت ۳ (اصلاح UX) — گزارش مراحل تمام‌شده: لاگ‌ها حالا ماندگارند؛ دکمه چیپ‌مانند «گزارش (N)» با ChevronDown چرخان روی هر مرحله done/error برای باز/بسته‌کردن LogBox (مراحل running مثل قبل خودکار نمایش می‌دهند)؛ برچسب «live log» به «گزارش مرحله» تغییر کرد
- تست E2E با agent-browser: بازکردن کتابخانه از سربرگ → ۱۰ کارت واقعی با پیش‌نمایش زنده (واترمارک‌ها در پیش‌نمایش‌ها دیده می‌شوند) ✓؛ جستجوی «هدفون» → ۱ کارت ✓؛ فیلتر تم بنفش (۴) → ۴ کارت با میانگین به‌روز ✓؛ ساخت کارت QA → حذف از UI با تأیید → toast + شمارنده ۰ + حالت خالی ✓؛ پاک‌سازی داده QA ✓؛ دراپ‌داون قلم: ۴ گزینه هرکدام با فونت خودشان ✓؛ انتخاب لاله‌زار → تریگر + پیش‌نمایش زنده با font=lalezar + autosave ✓؛ تصویر تازه کارت با قلم شغل (job.watermarkFont) ✓؛ job کامل جدید (دیور ساواج، قلم لاله‌زار، تم طلایی): ۶ مرحله done، واترمارک «گالری تست فونت» با حروف گرد لاله‌زار روی کارت نهایی + تم طلایی در HTML ✓؛ rerun → لاگ‌ها ماندگار شدند (بعد از restart) ✓؛ toggle گزارش مراحل → LogBox با لاگ‌های بایگانی‌شده ✓؛ دارک‌مود کتابخانه ✓؛ موبایل ۳۹۰px: نوار ابزار جمع‌شونده، گرید تک‌ستونه، بدون overflow-X ✓؛ کنسول پاک ✓
- پاک‌سازی: قلم تنظیمات به vazirmatn برگردانده شد؛ داده‌های QA حذف شدند
- lint: 0 خطا/0 هشدار؛ tsc src: 0 خطا

Stage Summary:
- دو قابلیت جدید + یک بهبود UX فعال و تست‌شده: کتابخانه سراسری کارت‌ها (جستجو/فیلتر/مرتب‌سازی/CSV/حذف/پیش‌نمایش تنبل)، ۴ قلم فارسی واترمارک با پیش‌نمایش زنده، گزارش بایگانی مراحل با toggle
- دو باگ رفع شد: پاک‌شدن لاگ مراحل پس از اتمام (merge در saveStage + restart برای بارگذاری ماژول تازه)، کرش SelectItem با مقدار خالی در فیلتر تم
- API جدید/تغییرکرده: GET /api/cards، DELETE /api/cards/[cardId]، watermarkFont در POST /api/jobs و GET/POST /api/settings و cards/[cardId]/image و watermark-preview؛ ستون Job.watermarkFont
- فایل‌های جدید: src/app/api/cards/route.ts، src/components/card-library.tsx؛ فونت‌های public/fonts (Lalezar، Amiri، Vazirmatn-Black)
- فایل‌های تغییرکرده: src/lib/watermark.ts (WATERMARK_FONTS + font)، src/lib/pipeline.ts (fix saveStage + watermarkFont)، src/app/api/jobs/route.ts، src/app/api/settings/route.ts، src/app/api/cards/[cardId]/route.ts (+DELETE)، src/app/api/cards/[cardId]/image/route.ts، src/app/api/watermark-preview/route.ts، src/components/shared.tsx (font options)، src/components/app-header.tsx (دکمه کتابخانه)، src/components/settings-section.tsx (Select قلم + preview)، src/components/pipeline-panel.tsx (toggle گزارش)، src/app/page.tsx (font wiring)، src/app/globals.css (@font-face + کلاس‌ها)
- درس مهم این دور: پس از تغییر lib/pipeline.ts (یا هر lib سمت سرور که در درخواست background اجرا می‌شود) ممکن است ماژول قدیمی در پروسه next-server باقی بماند — restart سرور پس از تغییرات ساختاری الزامی است
- پیشنهاد دور بعد: صف همزمان چند job با نمایش موازی، خروجی چندزبانه (fa/en)، انتخاب قلم واترمارک در حالت لوگو (متن کنار لوگو)، برگه جستجوی سراسری بین همه پروسه‌ها (هماکنون فقط done)، استریم لاگ زنده با WebSocket به‌جای polling، صفحه مدیریت وب‌هوک بله به‌صورت برگه مستقل

---
Task ID: r8 (cron webDevReview round 8)
Agent: main (Z.ai Code)
Task: QA با agent-browser + رفع باگ نشت حروف چینی + سه قابلیت جدید (صف پردازش همزمان، نسخه انگلیسی کارت، کد Embed) + پالایش استایل

Work Log:
- QA اولیه با agent-browser: سرور سالم (HTTP 200)، کنسول دسکتاپ پاک، تاریخچه/گالری/چت‌بات سالم، موبایل بدون overflow-X
- باگ یافت‌شده در QA: متن فارسی کارت «عینک پلاریزه» حروف چینی داشت («فعالیت‌های户外 ایده‌آل») — نشت خروجی LLM
- رفع باگ: پاک‌ساز sanitizeFaText/sanitizeSpecs در src/lib/fa.ts (حذف CJK/کانا/هانگول/علائم CJK/عبری/تایلندی/… + تمیزکاری نشانه‌گذاری چسبیده)؛ اعمال در stageNaming (nameFa/nameEn با NOISE_EN)، stageOptimize (توضیح/مصرف/مشخصات)، fallbackDescription، چت‌بات ویرایشگر (edits)، ویرایش دستی کارت؛ کارت خراب DB اصلاح و HTML آن بازرندر شد؛ تست زنده با ۳ job جدید → صفر نویسه CJK
- قابلیت ۱ — صف پردازش همزمان: کامپوننت جدید job-queue-strip.tsx با کاوش /api/jobs (۶ ثانیه idle، ۲.۵ ثانیه فعال)؛ چیپ شیشه‌ای برای هر پروسه فعال با نام، مرحله جاری، شمار کارت و حلقه پیشرفت SVG؛ badge «در حال نمایش» برای پروسه tracked؛ کلیک روی چیپ = سوییچ پروسه؛ مخفی وقتی تنها پروسه فعال همان tracked است؛ دکمه شروع حالا حین اجرای پروسه دیگر هم فعال است (برچسب «پردازش همزمان جدید» با آیکون Layers + پیام راهنما)؛ ورودی/تنظیمات فقط هنگام starting قفل می‌شوند
- قابلیت ۲ — نسخه انگلیسی کارت: ۴ ستون جدید Card (descriptionEn/usageEn/specsEn/htmlEn با db push)؛ buildProductHtml پارامتر lang('fa'|'en') گرفت (dir/ltr + برچسب‌های انگلیسی: Product Specifications/How to Use/View Source Page/Processed & optimized by)؛ API جدید POST /api/cards/{id}/translate (ترجمه LLM + پاک‌سازی غیرلاتین + قیمت «N Toman» + رندر htmlEn)؛ دانلود ?lang=en با نام «-en.html»؛ ZIP شامل -en.html ها؛ badge «EN ✓» فیروزه‌ای + دکمه «نسخه EN/دانلود EN» در هر کارت گالری
- انسجام داده EN: rerun پروسه → باطل‌سازی EN همه کارت‌ها؛ ویرایش دستی/دستیار روی محتوا → باطل‌سازی EN همان کارت؛ تغییر تم → بازرندر htmlEn از محتوای ذخیره‌شده بدون فراخوانی مجدد مدل (تک کارت و تغییر گروهی تم)
- قابلیت ۳ — کد Embed: بخش جدید در دیالوگ اشتراک‌گذاری (iframe 480×720 گردگوشه lazy + دکمه کپی با تأیید + راهنمای فارسی)
- پالایش استایل: هدر موبایل (عنوان truncate یک‌خطی، برچسب «تنظیمات» فقط ≥420px، فشرده‌سازی gap)؛ ring زمردی هاور کارت گالری؛ گرادیان و لکه نور نوار صف؛ همه حالت‌های دارک بررسی شد
- تست E2E با agent-browser: دو پروسه موازی همزمان اجرا و کامل شدند (هدفون + پاوربانک)؛ نوار صف با ۲ چیپ روی دسکتاپ و دارک ✓؛ سوییچ بین پروسه‌ها ✓؛ دکمه «نسخه EN» → ترجمه ۳ ثانیه‌ای → دانلود خودکار → badge EN ✓؛ فایل EN در مرورگر: LTR کامل، «39,000,000 Toman»، برچسب‌های انگلیسی ✓؛ ZIP شامل -en.html ✓؛ ویرایش دستی → باطل‌سازی EN → ترجمه مجدد ✓؛ Embed کپی‌شدنی ✓؛ موبایل ۳۹۰px بدون overflow و هدر یک‌خطی ✓؛ کنسول پاک ✓
- lint: 0 خطا/0 هشدار؛ tsc src: 0 خطا (فقط examples/ قدیمی خارج از اپ)

Stage Summary:
- سه قابلیت جدید فعال و تست‌شده: صف پردازش همزمان چند پروسه با چیپ‌های زنده، نسخه انگلیسی چپ‌به‌راست کارت (ترجمه/دانلود تکی/ZIP/badge/بازرندر تم)، کد Embed در اشتراک‌گذاری
- یک باگ محتوایی رفع شد: پاک‌ساز نویسه‌های چینی/ژاپنی/کره‌ای از همه مسیرهای تولید متن (پایپ‌لاین، دستیار، ویرایش دستی) + اصلاح داده موجود
- Schema: ۴ ستون جدید روی Card (descriptionEn, usageEn, specsEn, htmlEn) — db push انجام شد
- فایل‌های جدید: src/components/job-queue-strip.tsx، src/app/api/cards/[cardId]/translate/route.ts
- فایل‌های تغییرکرده: src/lib/fa.ts (sanitizeFaText/sanitizeSpecs)، src/lib/pipeline.ts (sanitizer + باطل‌سازی EN هنگام rerun)، src/lib/card-template.ts (lang)، src/app/api/assistant/chat/route.ts، src/app/api/cards/[cardId]/route.ts (sanitizer + ابطال/بازرندر EN)، src/app/api/jobs/[id]/route.ts (hasEn)، src/app/api/jobs/[id]/download/[cardId]/route.ts (?lang=en)، src/app/api/jobs/[id]/download/route.ts (EN در ZIP)، src/app/api/jobs/[id]/theme/route.ts (بازرندر EN)، src/components/output-gallery.tsx (EnVersionButton + badge + Embed)، src/app/page.tsx (صف + شروع موازی)، src/components/app-header.tsx، src/components/shared.tsx (hasEn)
- پیشنهاد دور بعد: استریم لاگ زنده با WebSocket به‌جای polling، خروجی PDF از کارت (print stylesheet)، صفحه مدیریت وب‌هوک بله به‌صورت برگه مستقل، جستجوی سراسری بین همه پروسه‌ها، انتخاب قلم واترمارک برای متن کنار لوگو، تناوب خودکار شبانه برای به‌روزرسانی قیمت کارت‌های قدیمی

---
Task ID: r9 (cron webDevReview round 9)
Agent: main (Z.ai Code)
Task: QA با agent-browser + سه قابلیت جدید (خروجی PDF/چاپ، قیمت روز کارت، حاشیه سود و رُند قیمت) + سخت‌سازی DELETE + پالایش استایل

Work Log:
- QA اولیه: سرور سالم (HTTP 200)، lint ۰/۰، کنسول دسکتاپ/موبایل پاک، فوتر چسبان (footerBottom ≈ docH)، موبایل بدون overflow-X → پروژه پایدار؛ تمرکز بر قابلیت جدید
- قابلیت ۱ — خروجی PDF/چاپ از کارت: `GET /api/cards/{id}/share?print=1` با `@page A4 margin:10mm` + print-color-adjust exact (حفظ رنگ‌ها) + پنهان‌سازی نوار برند در print + اسکریپت auto window.print با تأخیر ۵۵۰ms + pill سبز راهنما («Save as PDF») فقط روی صفحه؛ دکمه «PDF / چاپ» (Printer icon) در گرید اکشن‌های هر کارت گالری و داخل دیالوگ مشاهده کامل
- قابلیت ۲ — به‌روزرسانی قیمت («قیمت روز»): API جدید `POST /api/cards/{cardId}/reprice` — جستجوی تازه «قیمت {نام} تومان» → استخراج/فیلتر پرت‌ها (همان منطق پایپ‌لاین) → میانه → اعمال حاشیه سود/رُند (تنظیمات فعلی کاربر، fallback به snapshot job) → ذخیره + رندر مجدد HTML فارسی + تازه‌سازی قیمت htmlEn موجود بدون فراخوانی مجدد مدل → پاسخ با oldPrice/newPrice/marketPrice/sourcesCount؛ دکمه «قیمت روز» در گالری (اسپینر + toast فارسی «قدیم ← جدید + بر اساس N سایت مرجع» + به‌روزرسانی درجای کارت)؛ دکمه چیپی «قیمت خودکار» کنار فیلد قیمت در دیالوگ ویرایش دستی (اعمال فوری + یادداشت سبز قدیم←جدید + onSaved برای سینک گالری)
- قابلیت ۳ — قیمت‌گذاری (حاشیه سود + رُند): `src/lib/pricing.ts` (applyJobPrice/sanitizeMarkup/sanitizeRound/PRICE_ROUND_OPTIONS)؛ ستون‌های `Job.priceMarkup`/`Job.priceRound` (db push) — POST /api/jobs مقادیر را هنگام ساخت job از Setting سراسری snapshot می‌کند؛ stagePricing پس از میانه حاشیه/رُند را اعمال و لاگ فارسی «💰 حاشیه سود ۱۰٪ + رُند → X به Y تغییر کرد» می‌نویسد (قیمت ارسالی خود کاربر دست‌نخورده)؛ GET/POST /api/settings فیلدهای priceMarkup (۰-۹۰)/priceRound (۰|۱۰۰۰|۵۰۰۰|۱۰۰۰۰) با اعتبارسنجی سرور؛ تب جدید «قیمت» در تنظیمات (۵ تب): Input درصد + چیپ‌های سریع ۰/۵/۱۰/۱۵/۲۰/۳۰٪ + Select رُند + کارت «محاسبه نمونه» با اسلایدر قیمت پایه (۱۰۰هزار تا ۵ میلیون) و قیمت نهایی گرادیانی زنده + ذخیره خودکار debounce ۹۰۰ms
- سخت‌سازی DELETE /api/jobs/{id}: retry سه‌باره با فاصله ۳۰۰ms روی خطای گذرای SQLite + تبدیل P2025 به `{ok:true, alreadyGone:true}` (خطای ۵۰۰ گذارای مشاهده‌شده در تست)
- پالایش استایل: TabsList تنظیمات ۵ ستونه با برچسب‌های کوتاه‌شده (واترمارک/قیمت/قالب/دستیار/بله + title کامل) که در عرض کم ستون تنظیمات بدون هم‌پوشانی جا شوند؛ icon shrink-0؛ متن سربرگ خروجی‌ها با ذکر PDF
- رفع UX: یادداشت «قیمت خودکار» قبلاً با سینک prop کارت بلافاصله پاک می‌شد → جدا‌سازی effect ریست یادداشت فقط روی باز شدن دیالوگ
- تست E2E با agent-browser + curl: share?print=1 شامل @page/cm-print-hint/window.print ✓؛ صفحه چاپ رندر کامل کارت + pill سبز ✓؛ reprice curl: 9,800,000→9,142,000 (بدون مارجین) و 9,142,000→10,055,000 (با ۱۰٪ + رُند ۵۰۰۰ = 9,141,500→10,055,650→10,055,000) ✓؛ دکمه «قیمت روز» در UI: toast قدیم←جدید + آپدیت زنده badge و پیش‌نمایش iframe ✓؛ «قیمت خودکار» ویرایشگر: 8,803,000→11,500,000→9,640,000 + یادداشت ماندگار ✓؛ پایپ‌لاین کامل با مارجین ۱۰٪: لاگ مرحله قیمت‌گذاری + قیمت نهایی 1,310,000→1,440,000 در کارت ✓؛ تب قیمت: کلیک چیپ ۱۰٪ → نمونه ۵۵۰٬۰۰۰ + autosave تایید با GET ✓؛ موبایل ۳۹۰px: ۵ تب بدون هم‌پوشانی + گرید اکشن‌ها + بدون overflow-X ✓؛ دارک‌مود تب قیمت ✓؛ DELETE با id ناموجود → ok+alreadyGone ✓؛ پاک‌سازی داده‌های QA و بازگردانی تنظیمات به ۰/۱۰۰۰ ✓
- نکته دیباگ: خطای «۵۰۰ حذف» و «تغییر قیمت/واترمارک» مشاهده‌شده در تست، ناشی از ارسال cardId به‌جای jobId در تست خودم بود (P2025) — هیچ باگ واقعی نبود؛ ۰ کارت یتیم در DB (بررسی SQL)
- lint: ۰ خطا/۰ هشدار؛ tsc src: ۰ خطا (فقط skills/ قدیمی خارج از اپ)

Stage Summary:
- سه قابلیت جدید فعال و تست‌شده: خروجی PDF/چاپ A4 از کارت، به‌روزرسانی «قیمت روز» (API + دو نقطه UI)، حاشیه سود و رُند قیمت با تب قیمت‌گذاری و اعمال در پایپ‌لاین/reprice
- Schema: دو ستون جدید Job (priceMarkup, priceRound) — db push انجام شد؛ پس از تغییر pipeline.ts سرور restart شد
- فایل‌های جدید: src/lib/pricing.ts، src/app/api/cards/[cardId]/reprice/route.ts
- فایل‌های تغییرکرده: prisma/schema.prisma، src/lib/pipeline.ts (markup در pricing + JobOptions)، src/app/api/jobs/route.ts (snapshot تنظیمات)، src/app/api/settings/route.ts، src/app/api/jobs/[id]/route.ts (DELETE سخت‌شده)، src/app/api/cards/[cardId]/share/route.ts (print mode)، src/app/page.tsx (state قیمت‌گذاری)، src/components/settings-section.tsx (تب قیمت + ۵ ستون)، src/components/output-gallery.tsx (RepriceButton + PrintCardButton)، src/components/card-editor-dialog.tsx (قیمت خودکار)
- پیشنهاد دور بعد: به‌روزرسانی گروهی قیمت همه کارت‌های یک پروسه با یک دکمه، زمان‌بند شبانه به‌روزرسانی قیمت کارت‌های قدیمی، انتخاب قلم متن کنار لوگو در حالت واترمارک لوگو، استریم لاگ زنده با WebSocket، خروجی PDF کاتالوگ کل پروسه (چند کارت در یک PDF)، نمایش تاریخچه تغییرات قیمت هر کارت (sparkline)

---
Task ID: r10 (cron webDevReview round 10)
Agent: main (Z.ai Code)
Task: QA جامع با agent-browser + سه قابلیت جدید (قیمت‌نگار/به‌روزرسانی گروهی قیمت، کاتالوگ PDF پروسه، بازسازی گرید اکشن‌ها) + پالایش استایل

Work Log:
- QA اولیه: سرور سالم (HTTP 200)، lint ۰/۰، کنسول دسکتاپ/موبایل پاک، بدون overflow-X، فوتر چسبان → پایپ‌لاین E2E کامل از UI (هدفون سونی WH-1000XM5 → هر ۶ مرحله → کارت done با قیمت ۴۸,۹۵۰,۰۰۰) و کتابخانه کارت‌ها (جستجو/فیلتر تم با شمارنده/CSV) تست و سالم بودند → بدون باگ بحرانی، تمرکز بر قابلیت جدید
- قابلیت ۱ — قیمت‌نگار (تاریخچه قیمت) + به‌روزرسانی گروهی قیمت:
  - ستون `Card.priceHistory` (JSON [{value,at,src}]) با db push؛ ثبت خودکار در همه مسیرهای تغییر قیمت: پایپ‌لاین (stagePricing)، قیمت روز تکی، گروهی (bulk)، ویرایش دستی، دستیار چت (هر کدام با srcTag مجزا)؛ حداکثر ۴۰ ردیف
  - `src/lib/reprice.ts` — هسته مشترک: pushPriceHistory/searchMarketPrice (جستجو+فیلتر پرت+میانه)/resolveMarkupRound (تنظیمات کاربر fallback پروسه)/renderCardHtml (fa+en)/repriceOneCard
  - ریفکتور `POST /api/cards/[cardId]/reprice` به استفاده از هسته مشترک (همان قرارداد پاسخ)
  - API جدید `POST /api/jobs/[id]/reprice` — قیمت‌روز گروهی همه کارت‌های آماده پروسه (سقف ۱۲ کارت/درخواست، فیلتر اختیاری cardIds) → پاسخ با خلاصه per-card (updated/confirmed/failed + قدیم←جدید + شمار منابع)
  - `priceHistory` در GET /api/jobs/{id} (mapCard) و JSON ساختاریافته (price.history) اضافه شد
- UI قیمت‌نگار: دکمه «قیمت‌روز گروهی» با Popover تأیید (شمار کارت‌ها) + دیالوگ نتیجه گروهی (فهرست per-card: قدیم ← جدید / تأیید شد / خطا با رنگ‌بندی)؛ PriceDeltaBadge روی هر کارت (٪ تغییر از ابتدا با TrendingUp/Down — به‌روزرسانی زنده پس از reprice)؛ PriceSparkline در دیالوگ مشاهده کامل: SVG نمودار خطی با ناحیه گرادیانی (کهربایی صعودی/فیروزه‌ای نزولی)، tooltip بومی نقاط، فهرست ۸ تغییر آخر با تاریخ فارسی + badge منبع (پایپ‌لاین/قیمت روز/گروهی/دستی/دستیار) + دلتای هر مرحله
- قابلیت ۲ — کاتالوگ PDF پروسه: API جدید `GET /api/jobs/{id}/catalog` — HTML مستقل A4: جلد گرادیانی زمردی با بافت نقطه‌ای (نام برند، تاریخ فارسی، ۳ آمار: تعداد/دارای قیمت/جمع ارزش، فهرست کالاها با خط‌چین و قیمت)، سپس یک «sheet» برای هر کارت (سربرگ برند+عنوان+شماره دایره‌ای، کارت داخل iframe ایزوله srcdoc مقیاس 0.92 بدون تداخل CSS تم‌ها، پاورقی قیمت + شماره صفحه)؛ ?print=1 → @page A4 + print-color-adjust + page-break + auto window.print + پنهان‌سازی نوار ابزار؛ حالت صفحه: نوار تیره پایین با دکمه «چاپ / ذخیره PDF»؛ دکمه «کاتالوگ PDF» در سربرگ گالری (کنار تغییر گروهی تم)
- قابلیت ۳ — بازسازی گرید اکشن‌های کارت (UX): قبلاً ۱۰ دکمه در ۵ ردیف → اکنون ۳ ردیف + منو: ردیف ۱: دانلود HTML | مشاهده کامل، ردیف ۲: ویرایش هوشمند | ویرایش دستی، ردیف ۳: قیمت روز | نسخه EN، و «گزینه‌های بیشتر» (DropdownMenu دوستونه با کادر خط‌چین): کپی کد HTML، دانلود JSON، PDF/چاپ، کپی لینک عمومی، باز کردن صفحه عمومی؛ دیالوگ مشاهده کامل همچنان PDF/چاپ + اشتراک‌گذاری کامل (QR/Embed) را دارد
- پالایش استایل: توضیح سربرگ خروجی‌ها با ذکر کاتالوگ PDF؛ نشان دلتا با رنگ‌بندی amber/teal هماهنگ پالت؛ tooltip فارسی روی نشان‌ها؛ hint فارسی برای کارت‌های بدون تاریخچه
- تست E2E با agent-browser + curl: پایپ‌لاین کامل از UI ✓؛ کاتالوگ ۳ کارته: جلد (آمار و فهرست) + ۳ صفحه کارت با واترمارک و پاورقی قیمت رندر کامل ✓؛ bulk reprice curl: ۳ کارت همه updated (۹۷۰ه→۶۲۰ه، ۶,۳۵۶,۵۰۰→۷,۳۹۳,۰۰۰، ۳,۹۹۸,۹۵۰→۵,۲۴۸,۰۰۰) + ردیف تاریخچه bulk ثبت شد ✓؛ فیلتر cardIds در bulk ✓؛ reprice دوم → تاریخچه ۲ نقطه‌ای + sparkline با خط صعودی و دلتا +۶۹۸,۰۰۰ در UI ✓؛ قیمت روز تکی از UI (مسیر ریفکتور شده): ۱,۳۱۸,۰۰۰→۹۷۰,۰۰۰ + badge دلتا زنده +۱۱۳٪→+۵۷٪ + آپدیت iframe ✓؛ JSON خروجی شامل history ۳ ردیفه ✓؛ dropdown پنج‌گزینه‌ای باز شد ✓؛ دارک‌مود دکمه‌های جدید ✓؛ موبایل ۳۹۰px بدون overflow با گرید جدید ✓؛ کنسول پاک ✓
- نکته: جلد کاتالوگ اگر فهرست خیلی بلند شود overflow:hidden دارد (سقف عملی ~۱۲ کارت/سقف MAX_CARDS گروهی ۱۲)
- lint: ۰ خطا/۰ هشدار؛ tsc src: ۰ خطا

Stage Summary:
- سه قابلیت جدید فعال و تست‌شده: قیمت‌نگار با نمودار و ثبت خودکار در ۵ مسیر + به‌روزرسانی گروهی قیمت پروسه (API + تأیید + دیالوگ نتیجه)، کاتالوگ PDF چاپی A4 کل پروسه با جلد و فهرست، بازساختازی کامل اکشن‌های کارت به گرید تمیز + منوی گزینه‌های بیشتر
- Schema: ستون جدید `Card.priceHistory` — db push انجام شد؛ سرور پس از تغییر pipeline.ts restart شد
- فایل‌های جدید: src/lib/reprice.ts، src/app/api/jobs/[id]/reprice/route.ts، src/app/api/jobs/[id]/catalog/route.ts
- فایل‌های تغییرکرده: prisma/schema.prisma، src/lib/types.ts (PriceHistoryRow)، src/lib/pipeline.ts (ثبت history)، src/lib/card-json.ts (price.history)، src/app/api/cards/[cardId]/reprice/route.ts (ریفکتور به هسته مشترک)، src/app/api/cards/[cardId]/route.ts، src/app/api/assistant/chat/route.ts، src/app/api/jobs/[id]/route.ts (priceHistory در پاسخ)، src/components/output-gallery.tsx (BulkRepriceButton/CatalogButton/PriceSparkline/PriceDeltaBadge/گرید جدید/دروپ‌داون)
- پیشنهاد دور بعد: استریم لاگ زنده با WebSocket به‌جای polling، زمان‌بند شبانه خودکار «قیمت روز» برای کارت‌های قدیمی با اعلان بله، انتخاب قلم واترمارک در حالت لوگو، خروجی Excel (xlsx) با استایل فارسی، صفحه مدیریت وب‌هوک بله به‌صورت برگه مستقل، دسته‌بندی/برچسب‌گذاری کارت‌ها در کتابخانه
---
Task ID: r11 (cron webDevReview round 11)
Agent: main (Z.ai Code)
Task: QA با agent-browser + سه قابلیت جدید (خروجی اکسل استایل‌دار، برچسب‌گذاری کارت‌ها، زمان‌بند خودکار شبانه قیمت) + پالایش استایل

Work Log:
- QA اولیه: سرور سالم (HTTP 200)، lint ۰/۰، کنسول دسکتاپ/موبایل پاک، فوتر چسبان (footerBottom = vh)، بدون overflow-X؛ ۲۱ کارت/۱۷ پروسه در تاریخچه → پروژه پایدار؛ بدون باگ بحرانی، تمرکز بر سه قابلیت پیشنهادی دور قبل
- نکته عملیاتی: سرور یک‌بار با pkill غیرعمدی کشته شد → با setsid nohup دوباره بالا آمد؛ درس: kill فقط با lsof -t -i:3000
- قابلیت ۱ — خروجی اکسل (xlsx) استایل‌دار: `src/lib/card-excel.ts` با ExcelJS (bun add exceljs + serverExternalPackages در next.config)؛ دو شیت: «کارت‌ها» (rightToLeft + freeze pane + سربرگ زمردی ۱۳ ستونه + نوار یک‌درمیان + قالب عدد #,##0 قیمت + هایپرلینک کلیک‌پذیر + autoFilter + برچسب‌ها) و «خلاصه» (۷ آمار کلیدی: شمار کارت‌ها، قیمت‌دارها، میانگین/کمینه/بیشینه/جمع ارزش + توزیع تم‌ها + توزیع برچسب‌ها)؛ API جدید `GET /api/jobs/[id]/excel` (همه کارت‌های پروسه) و `GET /api/cards/excel` (کتابخانه با همان فیلترهای q/theme/tag/sort، سقف ۵۰۰)؛ دکمه «خروجی اکسل» در سربرگ گالری + دکمه «اکسل» در نوار ابزار کتابخانه (همان فیلترهای فعال اعمال می‌شود)
- قابلیت ۲ — برچسب‌گذاری کارت‌ها: ستون `Card.tags` (JSON آرایه، db push)؛ POST /api/cards/[cardId] پارامتر tags می‌پذیرد (پاک‌سازی: حداکثر ۸ برچسب × ۲۴ نویسه، یکتا)؛ GET /api/cards: tags در پاسخ + توزیع برچسب‌ها (فیلد tags) + فیلتر `?tag=` با contains روی JSON؛ GET /api/jobs/[id] (mapCard) و JSON ساختاریافته (buildCardJson) و CSV گالری/کتابخانه همگی شامل برچسب‌ها؛ UI: ویرایشگر دستی کارت بخش «برچسب‌ها» (چیپ‌های رنگی از tagColor با پالت ۶ رنگ هش‌شده + Input با Enter + دکمه + + toast سقف ۸)، کتابخانه: Select فیلتر برچسب با شمار + چیپ برچسب روی کاشی‌ها (۳ + «+N»)، گالری: badge ۲ برچسب اول + «+N» روی هر کارت
- قابلیت ۳ — زمان‌بند خودکار شبانه «قیمت روز»: `src/lib/auto-reprice.ts` (getAutoRepriceConfig / runAutoRepriceOnce با srcTag جدید 'auto' در PriceHistoryRow / tick هر ۵ دقیقه)؛ بوت با `src/instrumentation.ts` (register در NEXT_RUNTIME=nodejs + گارد Symbol برای idempotency در HMR)؛ منطق: کارت‌های done قیمت‌دار قدیمی‌تر از autoRepriceAgeDays (پیش‌فرض ۷ روز)، قدیمی‌ترین اول، سقف ۱۲ کارت در هر شب، قیمت با حاشیه سود/رُند فعلی، ثبت در قیمت‌نگار، ذخیره autoRepriceLastDate/LastResult؛ اعلان مستقل بله با سوییچ autoRepriceNotify (خلاصه تغییرات 💰 قدیم←جدید)؛ API جدید `GET /api/auto-reprice` (وضعیت + eligible + تخمین اجرای بعدی) و `POST {action:"run"}` (اجراهای پس‌زمینه)؛ کلیدهای تنظیم: autoReprice/autoRepriceHour/autoRepriceAgeDays/autoRepriceNotify در GET/POST /api/settings با اعتبارسنجی؛ UI کارت کهربایی «به‌روزرسانی خودکار شبانه قیمت‌ها» در تب قیمت تنظیمات: سوییچ فعال + badge «فعال» + Select ساعت (۱۱ گزینه) + Select قدمت (۱-۹۰ روز) + سوییچ اعلان بله + خط وضعیت (آخرین اجرا/نتیجه/اجرای بعدی/واجدان شرط) + دکمه «اجرای فوری» با polling نتیجه تا ۴ دقیقه + پنل جزئیات per-card (قدیم←جدید / تأیید / خطا)
- تست‌های E2E: اکسل پروسه (۸.۹KB) و کتابخانه (۱۲.۸KB) → فایل Microsoft Excel 2007+ معتبر با دو شیت RTL، سربرگ فارسی، برچسب‌ها و خلاصه ✓؛ اکسل با فیلتر برچسب ✓؛ ذخیره ۵ برچسب از UI ویرایشگر (چیپ‌های رنگی + Enter) → toast ذخیره ✓؛ توزیع برچسب‌ها در API ✓؛ فیلتر `?tag=` فقط ۱ کارت سازگار ✓؛ چیپ‌های برچسب روی کاشی کتابخانه (۳ + «+۲») و badge گالری (۲ + «+۳») ✓؛ auto-reprice واقعی: کارت QA ۳۰ روزه «روغن آرگان» (۵۰۰٬۰۰۰) درج در DB با SQL مستقیم → اجرای دستی → جستجوی واقعی قیمت → ۷۲۷٬۰۰۰ با رُند هزار + ردیف تاریخچه src='auto' + HTML بازرندر ✓؛ پاک‌سازی داده QA ✓؛ UI کارت زمان‌بند (فعال‌سازی از سوییچ، خط وضعیت با آخرین اجرا ۱۸ شهریور ۰۱:۳۰ و اجرای بعدی ۱۹ شهریور ۰۳:۰۵، جزئیات ۵۰۰٬۰۰۰←۷۲۷٬۰۰۰) ✓؛ رگرسیون چت دستیار (ok) و JSON دانلود (tags: 5) ✓؛ دارک‌مود همه عناصر جدید ✓؛ موبایل ۳۹۰px بدون overflow، فوتر چسبان ✓؛ کنسول پاک ✓
- پاک‌سازی نهایی: autoReprice به ۰ برگردانده شد (تنظیمات تحویل تمیز)؛ برچسب‌های دمو روی کارت هدفون ماند (محتوای واقعی و نمایشی)
- lint: ۰ خطا/۰ هشدار

Stage Summary:
- سه قابلیت جدید فعال و تست‌شده: خروجی اکسل دو‌شیتی استایل‌دار (پروسه + کتابخانه با فیلتر)، سیستم برچسب‌گذاری کارت‌ها (ویرایشگر + فیلتر کتابخانه + نمایش در گالری + سینک با JSON/CSV/اکسل)، زمان‌بند خودکار شبانه قیمت با اعلان بله و اجرای فوری
- Schema: ستون جدید `Card.tags` — db push انجام شد؛ سرور restart شد (instrumentation + Prisma client جدید)
- API جدید/تغییرکرده: GET /api/jobs/[id]/excel، GET /api/cards/excel، GET+POST /api/auto-reprice، tags در POST /api/cards/[cardId] و GET /api/cards (+?tag= + توزیع) و GET /api/jobs/[id] و خروجی JSON/CSV ها؛ ۴ کلید جدید تنظیمات
- فایل‌های جدید: src/lib/card-excel.ts، src/lib/auto-reprice.ts، src/instrumentation.ts، src/app/api/jobs/[id]/excel/route.ts، src/app/api/cards/excel/route.ts، src/app/api/auto-reprice/route.ts
- فایل‌های تغییرکرده: prisma/schema.prisma، next.config.ts (serverExternalPackages: exceljs)، src/lib/types.ts + reprice.ts (src='auto')، src/lib/card-json.ts (tags)، src/app/api/settings/route.ts، src/app/api/cards/route.ts، src/app/api/cards/[cardId]/route.ts، src/app/api/jobs/[id]/route.ts، src/components/shared.tsx (tags در CardWithHtml + tagColor)، src/components/card-editor-dialog.tsx (ویرایشگر برچسب)، src/components/card-library.tsx (فیلتر برچسب + چیپ + اکسل)، src/components/output-gallery.tsx (دکمه اکسل + badge برچسب + ستون CSV)، src/components/settings-section.tsx (AutoRepriceCard)
- پیشنهاد دور بعد: استریم لاگ زنده با WebSocket به‌جای polling، خروجی PDF صورتحساب/فاکتور از کارت، انتخاب قلم واترمارک در حالت لوگو، جستجوی سراسری بین همه پروسه‌ها در سربرگ، گروه‌بندی کارت‌ها بر اساس برچسب در نمای کتابخانه، آمار «تغییرات قیمت هفته» در StatsBar با داده priceHistory
---
Task ID: r12 (cron webDevReview round 12)
Agent: main (Z.ai Code)
Task: پیاده‌سازی «دریافت درخواست‌ها / ارتباط با برنامه» — وب‌سرویس عمومی v1 با کلید API (sk-ph-...) بر اساس درخواست کاربر + تست اتصال دستیار + رفع ۳ خطای تایپ قدیمی

Work Log:
- درخواست کاربر: پنل «دریافت درخواست‌ها» با Base URL + API Key (ماسک‌شده sk-ph-f7****4fab) + «بازتولید کلید» + بخش «ارتباط با برنامه» → پیاده‌سازی کامل شد
- زیرساخت کلید: `src/lib/api-auth.ts` (generateApiKey با قالب sk-ph-+32hex، ensureApiKey با ساخت خودکار، checkApiAuth با ۳ مسیر: Authorization Bearer / x-api-key / ?apiKey=، maskApiKey به شکل sk-ph-f7****4fab، هدرهای CORS مشترک v1Error)؛ کلید در Setting جدول (key='apiKey')؛ DELETE کلید هم پشتیبانی شد
- API مدیریت کلید: `GET/POST /api/apikey` (دریافت با ساخت خودکار / بازتولید با ابطال فوری کلید قبلی)
- وب‌سرویس عمومی /api/v1 (همه با CORS و OPTIONS):
  - `GET /api/v1` — نمای خودتوضیح endpoints (بدون کلید)
  - `GET /api/v1/health` — سلامت (بدون کلید) با نام/نسخه/زمان
  - `GET /api/v1/products?q=&jobId=&limit=` — فهرست کارت‌ها (سقف ۱۰۰، hasImage/hasEn، حذف data: از imageUrl)
  - `GET /api/v1/products/{id}` — جزئیات کامل (job، منابع قیمت، تاریخچه، مشخصات fa/en، issues، tags، shareUrl/downloadUrl)
  - `POST /api/v1/generate` — بدنه JSON {input: string|string[], watermarkText/Mode/Pos/Size/Font, cardTheme} → ساخت Job با snapshot تنظیمات قیمت + اجرای پس‌زمینه runPipeline → {jobId, cards, poll}
  - `GET /api/v1/jobs/{id}` — وضعیت + مراحل (۶ لاگ آخر هر مرحله) + کارت‌ها با پیشرفت
  - `POST /api/v1/chat` — همان دستیار ویرایشگر با کلید (پروتکل __EDITS__ و اعمال روی کارت)
- ریفکتور چت دستیار: هسته به `src/lib/assistant-core.ts` (runAssistantChat + SYSTEM_BASE + cardContext) منتقل شد؛ `src/lib/external-llm.ts` (callExternal + getExternalAssistantConfig)؛ `/api/assistant/chat` و `/api/v1/chat` هر دو از هسته مشترک استفاده می‌کنند — رفتار یکسان
- API جدید `POST /api/assistant/test` — آزمون اتصال دستیار (خارجی اگر فعال، وگرنه داخلی) → {via, viaLabel, model, latencyMs, sample}
- UI تب ششم تنظیمات «ارتباط» (آیکون Cable، گرید ۶ ستونه): پنل `ApiConnectionPanel` با بخش «دریافت درخواست‌ها» (Base URL با کپی، API Key ماسک‌شده با چشم/کپی، «بازتولید کلید» با AlertDialog تأیید فارسی، badge «فعال»، «آزمون اتصال» با latency فارسی) و بخش «ارتباط با برنامه» (Accordion سه‌تایی: وب‌سرویس REST با جدول ۷ endpoint و badge متد + نمونه curl واقعی با کلید جاری و کپی، ویجت چت با snippet و کپی، وب‌هوک بله با آدرس و کپی)؛ ردیف کلید flex-wrap شد تا در موبایل مرتب شکسته شود
- UI تب دستیار: ردیف «آزمون اتصال دستیار» خارج از ناحیه قفل (pointer-events-none) قرار گرفت تا با سوییچ خاموش هم دستیار داخلی آزموده شود؛ badge نتیجه «داخلی/خارجی • مدل • latency» — باگ اولیه: دکمه داخل ناحیه قفل بود و کلیک به آن نمی‌رسید → جابه‌جا شد
- رفع ۳ خطای tsc قدیمی: TAG_PALETTE/tagColor (حذف فیلد text اضافی در shared.tsx)، card.tags undefined در output-gallery، lastChange→lastPriceChange در card-excel.ts
- تست‌های E2E curl: health/index بدون کلید ✓؛ ۴۰۱ بدون کلید و با کلید غلط ✓؛ Bearer/x-api-key/?apiKey= هر سه ✓؛ بازتولید → کلید قبلی ۴۰۱ و جدید ۲۰۰ ✓؛ v1/products (۳ کارت) و جزئیات (۱۲ specs، ۵ tags) ✓؛ v1/chat پاسخ فارسی ✓؛ v1/generate واقعی «روغن آرگان» → هر ۶ مرحله done با قیمت ۵۸۱,۰۰۰ تومان در ~۴۵ ثانیه + poll سالم ✓ (job آزمون حذف شد)
- تست‌های agent-browser: تب ارتباط دسکتاپ (ماسک sk-ph-2b****14e1 → نمایش کامل با چشم → آزمون اتصال «پاسخ سالم • ۲۳ میلی‌ثانیه») ✓؛ آکاردئون‌های REST/ویجت/بله با محتوای صحیح ✓؛ دیالوگ بازتولید (باز/لغو/تأیید → ماسک جدید sk-ph-67****82bd + toast) ✓؛ کلید جدید با curl تأیید ✓؛ دارک‌مود کامل ✓؛ موبایل ۳۹۰px بدون overflow-X با ۶ تب و شکستن مرتب ردیف کلید ✓؛ تب دستیار: آزمون → «داخلی • ۲۸۲ میلی‌ثانیه» ✓؛ رگرسیون /api/assistant/chat پس از ریفکتور ✓؛ فوتر چسبان (footerBottom=vh روی صفحه کوتاه) ✓؛ کنسول پاک ✓
- lint: ۰ خطا/۰ هشدار؛ tsc src: ۰ خطا

Stage Summary:
- قابلیت جدید کامل: این برنامه اکنون خودش یک وب‌سرویس عمومی v1 با کلید sk-ph- است — پنل «دریافت درخواست‌ها» (Base URL/کلید ماسک/بازتولید/آزمون) و «ارتباط با برنامه» (REST + ویجت + وب‌هوک بله) دقیقاً مطابق نمونه‌ای که کاربر فرستاد
- ۸ مسیر API جدید: /api/apikey (GET/POST)، /api/v1 (index)، /api/v1/health، /api/v1/products، /api/v1/products/{id}، /api/v1/generate، /api/v1/jobs/{id}، /api/v1/chat + /api/assistant/test
- فایل‌های جدید: src/lib/api-auth.ts، src/lib/external-llm.ts، src/lib/assistant-core.ts، ۸ پوشه route جدید
- فایل‌های تغییرکرده: settings-section.tsx (تب «ارتباط» + آزمون اتصال دستیار)، assistant/chat/route.ts (ریفکتور به هسته مشترک)، shared.tsx، output-gallery.tsx، card-excel.ts (رفع خطاهای تایپ)
- نکته امنیتی: کلید فعلی در دیتابیس ذخیره است و کاربر هر زمان از تب «ارتباط» می‌تواند بازتولید کند؛ همه مسیرهای v1 جز health و index کلید می‌خواهند
- پیشنهاد دور بعد: محدودیت نرخ (rate-limit) روی /api/v1، چند کلید با نام و تاریخ انقضا، صفحه مستند تعاملی /api/v1/docs با «Try it»، استریم لاگ زنده WebSocket، خروجی PDF فاکتور، فونت واترمارک کنار لوگو
