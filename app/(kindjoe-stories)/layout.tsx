import KindJoeModal from "@/components/modals/kindjoe-introduction/kindjoe-modal";
import Navbar from "@/components/navbar";
import { Footer } from "react-day-picker";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <KindJoeModal />
      <main>{children}</main>
      <Footer />
    </>
  );
}
