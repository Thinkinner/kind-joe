import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Sleek text styling for the mobile overlay vs desktop
export const authFooterLeadClass =
  "text-[14px] font-medium text-white lg:font-normal lg:text-zinc-600";

export const authFooterHintClass =
  "text-[13px] leading-relaxed text-white/70 lg:text-zinc-500";

/** Solid brand button for footer CTAs (Get started, Sign in, etc.) */
export const authFooterLinkClass =
  "inline-flex min-h-10 items-center justify-center rounded-lg bg-[#102A80] px-4 py-2 text-[14px] font-semibold text-white shadow-md shadow-black/25 transition [-webkit-tap-highlight-color:transparent] hover:bg-[#0c2260] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 lg:shadow-sm lg:shadow-[#102A80]/20";

type AuthPageFooterProps = {
  children: ReactNode;
  className?: string;
};

export function AuthPageFooter({ children, className }: AuthPageFooterProps) {
  return (
    <div
      className={cn(
        // Mobile: Deep premium glass effect
        "space-y-4 rounded-2xl border border-white/10 bg-black/40 px-5 py-5 text-center shadow-2xl backdrop-blur-2xl",
        // Desktop: Flat and seamless
        "lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none lg:backdrop-blur-none",
        className
      )}
    >
      {children}
    </div>
  );
}