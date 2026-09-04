import { Suspense } from "react";
import GetEmail from "@/components/stories/kindjoe-get-email";
import { JoesFriendsPromo } from "@/components/ads/joes-friends-promo";
import { EditorsPicks, EditorsPicksSkeleton } from "@/components/home/editors-picks";

export function HomepageSidebar() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-14 lg:items-start">
      <Suspense fallback={<EditorsPicksSkeleton />}>
        <EditorsPicks />
      </Suspense>
      <div className="flex flex-col gap-8">
        <GetEmail />
        <JoesFriendsPromo />
      </div>
      {/* ADSENSE_HOLDBACK: sidebar ad hidden until approval. Restore: docs/homepage-adsense-holdback.md */}
    </div>
  );
}
