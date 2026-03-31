import { NavbarWithSession } from "@/components/navbar-with-session";
import { Footer } from "@/components/footer";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavbarWithSession />
      {children}
      <Footer />
    </>
  );
}
