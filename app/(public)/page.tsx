import type { Metadata } from "next";
import { LocalNewsSections } from "@/components/home/local-news-sections";
import { HomepageSidebar } from "@/components/home/homepage-sidebar";
import { publicSiteOrigin } from "@/lib/site/public-site-url";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Kind Joe — Local News for LA, Ventura County & San Luis Obispo",
  description:
    "Kind Joe covers Los Angeles, Ventura County, and San Luis Obispo with original local reporting and analysis.",
  alternates: {
    canonical: publicSiteOrigin(),
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-neutral-900">
      <main>
        <LocalNewsSections />

        <div className="border-t border-neutral-200">
          <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
            <HomepageSidebar />
          </div>
        </div>
      </main>
    </div>
  );
}
