"use client";

import Link from "next/link";
import { BookOpenText, FileText, ScrollText } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { developerDocsNav, isDocsHrefActive } from "@/lib/developers/docs-nav";

const sectionIcons = {
  Overview: BookOpenText,
  APIs: FileText,
  Updates: ScrollText,
} as const;

export function DeveloperDocsSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="border-r border-slate-200/80 bg-white/95"
    >
      <SidebarHeader className="px-3 py-3">
        <Link
          href="/developers"
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold shadow-sm"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
            DK
          </span>
          <span className="truncate">Developer.KindJoe</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {developerDocsNav.map((section) => {
          const Icon = sectionIcons[section.title as keyof typeof sectionIcons];
          return (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel className="gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                <span>{section.title}</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isDocsHrefActive(pathname, item.href)}
                        className="rounded-lg data-[active=true]:bg-slate-900 data-[active=true]:text-white"
                      >
                        <Link href={item.href}>
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3">
        <p className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500">
          KindJoe Developer Platform
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
