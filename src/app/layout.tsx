import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "کارت‌ساز هوشمند محصول",
  description:
    "ساخت خودکار کارت محصول فروشگاهی با هوش مصنوعی: نام‌گذاری، قیمت‌گذاری، تصاویر و واترمارک، راستی‌آزمایی، بهینه‌سازی و ساخت کارت HTML فارسی",
  keywords: ["کارت محصول", "فروشگاه اینترنتی", "هوش مصنوعی", "واترمارک", "HTML"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- فونت وزیرمتن طبق طراحی الزامی است */}
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="bottom-left" offset="5.5rem" />
        </ThemeProvider>
      </body>
    </html>
  );
}
