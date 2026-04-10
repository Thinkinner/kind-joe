import { Footer } from "@/components/footer";
import { NavbarWithSession } from "@/components/navbar-with-session";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavbarWithSession />
      {children}
      <Footer />
    </>
  );
}
