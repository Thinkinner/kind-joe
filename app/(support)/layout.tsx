import Navbar from "@/components/navbar";
import { Footer } from "react-day-picker";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
