import { Suspense } from "react";
import GetEmail from "@/components/stories/kindjoe-get-email";
import { EditorsPicks, EditorsPicksSkeleton } from "@/components/home/editors-picks";

export function HomepageSidebar() {
  return (
    <>
      <Suspense fallback={<EditorsPicksSkeleton />}>
        <EditorsPicks />
      </Suspense>
      <GetEmail />
      {/* ADSENSE_HOLDBACK: sidebar ad hidden until approval. Restore: docs/homepage-adsense-holdback.md */}
    </>
  );
}
