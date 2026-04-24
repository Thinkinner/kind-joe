import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DeveloperDocsSidebar } from "@/components/developers/developer-docs-sidebar";
import { DeveloperDocsHeader } from "@/components/developers/developer-docs-header";

export default function DeveloperDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen className="bg-slate-100/70">
      <DeveloperDocsSidebar />
      <SidebarInset className="min-h-svh bg-gradient-to-b from-slate-50 to-white">
        <DeveloperDocsHeader />
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
