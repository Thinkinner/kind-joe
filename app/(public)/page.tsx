import type { Metadata } from "next";
import { FrontPage } from "@/components/home/front-page";
import { HomepageSidebar } from "@/components/home/homepage-sidebar";
import { publicSiteOrigin } from "@/lib/site/public-site-url";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Kind Joe — News for LA, Ventura County & San Luis Obispo",
  description:
    "Top stories, latest reporting, and local coverage from Los Angeles, Ventura County, and San Luis Obispo — plus politics, tech, business, and opinion.",
  alternates: {
    canonical: publicSiteOrigin(),
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-neutral-900">
      <main>
        <FrontPage />

        <div className="border-t border-neutral-200">
          <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
            <HomepageSidebar />
          </div>
        </div>
      </main>
    </div>
  );
}
