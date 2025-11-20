import Ventura_Email_Capture_Modal from "@/components/ventura-county/modal/ventura-email-capture-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Ventura_Email_Capture_Modal />
      <main>{children}</main>
    </>
  );
}
