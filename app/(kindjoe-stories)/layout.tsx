import KindJoeModal from "@/components/modals/kindjoe-introduction/kindjoe-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <KindJoeModal />
      <main>{children}</main>
    </>
  );
}
