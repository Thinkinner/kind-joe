import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type KindJoeHorizontalLogoProps = {
  className?: string;
  href?: string;
  priority?: boolean;
  /** Visual height; width follows SVG aspect ratio (~4.2:1) */
  size?: "sm" | "md" | "lg";
};

const heightClass = {
  sm: "h-8 max-h-8 sm:h-9 sm:max-h-9",
  md: "h-9 max-h-9 sm:h-10 sm:max-h-10",
  lg: "h-10 max-h-10 sm:h-11 sm:max-h-11 lg:h-[3.25rem] lg:max-h-[3.25rem]",
} as const;

export function KindJoeHorizontalLogo({
  className,
  href = "/",
  priority = false,
  size = "md",
}: KindJoeHorizontalLogoProps) {
  const img = (
    <Image
      src="/brand/horizontal-logo.svg"
      alt="Kind Joe"
      width={894}
      height={213}
      priority={priority}
      className={cn(
        "w-auto object-contain object-right drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]",
        heightClass[size],
        className,
      )}
    />
  );

  if (!href) {
    return img;
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 outline-offset-4 transition hover:opacity-92 active:opacity-88",
        "[-webkit-tap-highlight-color:transparent]",
      )}
    >
      {img}
    </Link>
  );
}
