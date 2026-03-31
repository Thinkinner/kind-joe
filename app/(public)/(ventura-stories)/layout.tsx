import { NavbarWithSession } from "@/components/navbar-with-session";
import Ventura_Email_Capture_Modal from "@/components/ventura-county/modal/ventura-email-capture-modal";
import { Footer, Nav } from "react-day-picker";

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
