import KindJoeModal from "@/components/modals/kindjoe-introduction/kindjoe-modal";
import { NavbarWithSession } from "@/components/navbar-with-session";
import { Footer } from "@/components/footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavbarWithSession />
      <main>{children}</main>
      <Footer />
    </>
  );
}
