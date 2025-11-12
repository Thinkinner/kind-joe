// app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import EmailCaptureModal from "@/components/modals/email-capture-modal";
import KindJoeModal from "@/components/modals/kindjoe-introduction/kindjoe-modal";
import CookieConsent from "@/components/modals/cookie-consent";
import { cookies } from "next/headers";

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
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Kind Joe" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kind Joe",
    description:
      "Daily Top Stories and original Articles — thoughtfully curated.",
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
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

// 👇 make this async
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

  // COOKIES CONSENT
  // 👇 await the cookies() promise
  const cookieStore = await cookies();
  const consent = cookieStore.get("cookie_consent")?.value === "accepted";

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${poppins.variable} antialiased h-full bg-white text-slate-900`}
      >
        <Navbar />
        <main className="min-h-[calc(100dvh-4rem)]">{children}</main>
        <CookieConsent
          initiallyConsented={consent}
          policyHref="/privacy-policy"
          termsHref="/terms-of-service"
          delayMs={10_000} // 10 seconds
        />
        <KindJoeModal />
        <Script
          id="ld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
      </body>
    </html>
  );
}
