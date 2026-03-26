import { SignalsColorModeProvider } from "@/components/kindjoe-signals/signals-color-mode";

export default function KindJoeSignalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SignalsColorModeProvider>{children}</SignalsColorModeProvider>;
}
