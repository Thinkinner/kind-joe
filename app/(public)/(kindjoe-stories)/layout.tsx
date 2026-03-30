import KindJoeModal from "@/components/modals/kindjoe-introduction/kindjoe-modal";
import Navbar from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
