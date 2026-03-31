import type { ReactNode } from "react";
import Image from "next/image";
import { KindJoeHorizontalLogo } from "@/components/brand/kind-joe-horizontal-logo";
import { cn } from "@/lib/utils";

const HERO_SRC =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=2400&q=85";

const BRAND_OVERLAY =
  "linear-gradient(135deg, rgba(11, 20, 55, 0.85) 0%, rgba(26, 13, 34, 0.75) 44%, rgba(60, 11, 18, 0.82) 100%)";

export type AuthSplitMode = "signIn" | "join" | "recover" | "reset";

const HERO_COPY: Record<AuthSplitMode, { headline: string; sub: string }> = {
  signIn: { headline: "Stories that matter", sub: "Ventura County and beyond — curated for you." },
  join: { headline: "Join Kind Joe readers", sub: "Start in seconds. Email + one code, no password." },
  recover: { headline: "Reset your password", sub: "We will email you a link if this address is registered." },
  reset: { headline: "Set a new password", sub: "Complete the reset from your email link." },
};

type AuthSplitLayoutProps = {
  mode: AuthSplitMode;
  imageSide?: "left" | "right";
  priorityImage?: boolean;
  children: ReactNode;
};

export function AuthSplitLayout({
  mode,
  imageSide = "left",
  priorityImage = false,
  children,
}: AuthSplitLayoutProps) {
  const copy = HERO_COPY[mode];
  const heroOnRight = imageSide === "right";

  return (
    <div
      className={cn(
        "isolate grid min-h-dvh grid-cols-1 grid-rows-1 overflow-x-hidden bg-zinc-950",
        // Adjusted to a balanced 45/55 split on desktop
        heroOnRight
          ? "lg:grid-cols-[minmax(400px,0.45fr)_minmax(0,0.55fr)]"
          : "lg:grid-cols-[minmax(0,0.55fr)_minmax(400px,0.45fr)]"
      )}
    >
      <section
        className={cn(
          "relative -z-0 col-start-1 row-start-1 min-h-dvh w-full",
          heroOnRight ? "lg:col-start-2 lg:row-start-1" : "lg:col-start-1 lg:row-start-1"
        )}
        aria-label="Brand"
      >
        <Image
          src={HERO_SRC}
          alt=""
          fill
          priority={priorityImage}
          sizes="(max-width: 1023px) 100vw, 60vw"
          className="object-cover object-center saturate-[0.85] contrast-[1.1]"
        />

        <div className="absolute inset-0" style={{ background: BRAND_OVERLAY }} aria-hidden />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_70%_0%,rgba(207,26,30,0.15)_0%,transparent_60%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_10%_100%,rgba(16,42,128,0.25)_0%,transparent_50%)]" aria-hidden />

        {/* Softened center gradient for better mobile readability behind the form */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/40 lg:from-black/30 lg:via-transparent lg:to-black/20" aria-hidden />

        <div className="absolute inset-0 hidden flex-col justify-between p-8 lg:flex lg:p-12 xl:p-16">
          <div className="flex w-full justify-end">
            <KindJoeHorizontalLogo size="lg" priority={priorityImage} />
          </div>

          <div className="max-w-xl">
            <h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white drop-shadow-lg xl:text-[2.75rem]">
              {copy.headline}
            </h2>
            <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-white/90 drop-shadow-md xl:text-xl">
              {copy.sub}
            </p>
          </div>
        </div>
      </section>

      <section
        className={cn(
          "relative z-10 col-start-1 row-start-1 flex min-h-dvh w-full flex-col items-center justify-center",
          "px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6",
          "lg:max-w-none lg:items-center lg:justify-center lg:px-12 xl:px-20",
          "lg:bg-[linear-gradient(165deg,#ffffff_0%,#fafafa_50%,#f4f4f5_100%)]",
          heroOnRight ? "lg:col-start-1 lg:row-start-1 lg:border-r lg:border-zinc-200/80" : "lg:col-start-2 lg:row-start-1 lg:border-l lg:border-zinc-200/80"
        )}
      >
        <div className="flex w-full max-w-[420px] flex-col items-stretch justify-center gap-6 lg:gap-8">
          {children}
        </div>
      </section>
    </div>
  );
}