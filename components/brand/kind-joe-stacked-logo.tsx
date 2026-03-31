import Link from "next/link";
import { cn } from "@/lib/utils";

/** Brand blues/reds aligned with /brand/horizontal-logo.svg */
const BLUE = "#102A80";
const RED = "#CF1A1E";

type KindJoeStackedLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  href?: string;
};

const scales = {
  sm: {
    wrap: "gap-1",
    kind: "min-w-[5rem] rounded-tr-[1.25rem] px-3 py-1.5 text-sm",
    joe: "min-w-[5rem] rounded-bl-[1.25rem] px-3 py-1.5 text-sm",
  },
  md: {
    wrap: "gap-1.5",
    kind: "rounded-tr-[1.75rem] px-5 py-2.5 text-base sm:text-lg",
    joe: "rounded-bl-[1.75rem] px-5 py-2.5 text-base sm:text-lg",
  },
  lg: {
    wrap: "gap-2",
    kind: "min-w-[8.5rem] rounded-tr-[2rem] px-7 py-3.5 text-xl sm:text-2xl",
    joe: "min-w-[8.5rem] rounded-bl-[2rem] px-7 py-3.5 text-xl sm:text-2xl",
  },
} as const;

const wordClass =
  "inline-block text-center font-bold uppercase tracking-[0.28em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]";

export function KindJoeStackedLogo({
  size = "md",
  className,
  href = "/",
}: KindJoeStackedLogoProps) {
  const s = scales[size];

  const inner = (
    <span
      className={cn("flex flex-col items-center", s.wrap, className)}
      aria-label="Kind Joe home"
    >
      <span
        className={cn(wordClass, s.kind)}
        style={{ backgroundColor: BLUE }}
      >
        KIND
      </span>
      <span
        className={cn(wordClass, s.joe)}
        style={{ backgroundColor: RED }}
      >
        JOE
      </span>
    </span>
  );

  if (!href) return inner;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex outline-offset-4 transition hover:opacity-95 active:opacity-90",
        "[-webkit-tap-highlight-color:transparent]",
      )}
    >
      {inner}
    </Link>
  );
}
