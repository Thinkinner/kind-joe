import { Footer } from "@/components/footer";
import { NavbarWithSession } from "@/components/navbar-with-session";
import { MarketsStrip } from "@/components/home/markets-strip";
import { VideoModalAd } from "@/components/ads/video-modal-ad";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="sticky top-0 z-[60]">
        <NavbarWithSession />
        <MarketsStrip />
      </div>
      {children}
      <Footer />
      <VideoModalAd />
    </>
  );
}
