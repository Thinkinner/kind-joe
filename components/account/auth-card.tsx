import type { ReactNode } from "react";
import { KindJoeHorizontalLogo } from "@/components/brand/kind-joe-horizontal-logo";
import { cn } from "@/lib/utils";

type AuthCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: AuthCardProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl sm:rounded-[1.75rem]",
        /* Mobile: clearer glass, full width in column */
        "border border-white/50 bg-white/90 shadow-[0_20px_50px_-18px_rgba(11,20,55,0.4)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/88",
        /* Desktop: crisp paper */
        "lg:rounded-[2rem] lg:border-zinc-200/70 lg:bg-white lg:shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_2px_4px_rgba(15,23,42,0.02),0_20px_50px_-18px_rgba(15,23,42,0.14)] lg:backdrop-blur-none",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#102A80] via-[#2a4ab8] to-[#CF1A1E] opacity-95"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-[280px] rounded-full bg-gradient-to-br from-[#102A80]/[0.07] via-transparent to-[#CF1A1E]/[0.06] blur-2xl"
        aria-hidden
      />

      <div className="relative px-5 pb-8 pt-9 sm:px-7 sm:pb-9 sm:pt-10 lg:px-10 lg:pb-11 lg:pt-12">
        {eyebrow ? (
          <div className="flex justify-center lg:hidden">
            <KindJoeHorizontalLogo
              size="md"
              className="object-center drop-shadow-none"
            />
          </div>
        ) : null}
        <h1
          className={cn(
            "text-balance text-[1.65rem] font-semibold leading-[1.15] tracking-[-0.035em] text-zinc-950 sm:text-[1.875rem]",
            eyebrow ? "mt-5 lg:mt-0" : "mt-0",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-[34ch] text-pretty text-[15px] leading-relaxed text-zinc-500 sm:text-base sm:leading-relaxed">
            {description}
          </p>
        ) : null}
        <div className="mt-8 sm:mt-9">{children}</div>
      </div>
    </div>
  );
}
