"use client";

import { ThemeProvider } from "next-themes";

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="admin-theme-mode"
    >
      {children}
    </ThemeProvider>
  );
}
