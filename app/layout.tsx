// app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import GoogleAnalytics from "@/components/google-analytics";

import CookieConsent from "@/components/modals/cookie-consent";
import { cookies } from "next/headers";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") as string) ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Kind Joe", template: "%s • Kind Joe" },
  description:
    "Kind Joe curates daily Top Stories and publishes original Articles. A clean, fast, news-style reading experience.",
  keywords: ["Kind Joe", "Top Stories", "Articles", "News"],
  applicationName: "Kind Joe",
  category: "news",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Kind Joe",
    title: "Kind Joe",
    description:
      "Daily Top Stories and original Articles — thoughtfully curated.",
    images: [
      { url: "/brand/logo.svg", width: 1200, height: 630, alt: "Kind Joe" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kind Joe",
    description:
      "Daily Top Stories and original Articles — thoughtfully curated.",
    images: ["/brand/logo.svg"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/fpublic/brand/logo.svgavicon.ico" },
      { url: "/icon.svg", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kind Joe",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const cookieStore = await cookies();
  const consent = cookieStore.get("cookie_consent")?.value === "accepted";

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Subscribe with Google core script */}
        <Script
          src="https://news.google.com/swg/js/v1/swg-basic.js"
          strategy="afterInteractive"
        />

        {/* Subscribe with Google initialization */}
        <Script id="swg-init" strategy="afterInteractive">
          {`
            (self.SWG_BASIC = self.SWG_BASIC || []).push(basicSubscriptions => {
              basicSubscriptions.init({
                type: "NewsArticle",
                isPartOfType: ["Product"],
                isPartOfProductId: "CAow7Z_eCw:openaccess",
                clientOptions: { theme: "light", lang: "en" },
              });
            });
          `}
        </Script>
      </head>

      <body
        className={`${poppins.variable} antialiased h-full bg-white text-slate-900`}
      >
        <GoogleAnalytics />
        <Navbar />
        <main className="min-h-[calc(100dvh-4rem)]">{children}</main>
        <Footer />
        <Toaster position="top-center" richColors closeButton />
        <CookieConsent
          initiallyConsented={consent}
          policyHref="/privacy-policy"
          termsHref="/terms-of-service"
          delayMs={10_000}
        />
        <Analytics />
        <Script
          id="ld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
      </body>
    </html>
  );
}
