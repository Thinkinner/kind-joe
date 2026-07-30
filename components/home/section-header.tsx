import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  as?: "h1" | "h2";
  accentBarClass?: string;
  eyebrowClassName?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  as: Heading = "h2",
  accentBarClass = "bg-red-600",
  eyebrowClassName = "text-red-600",
}: SectionHeaderProps) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:mb-8 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span
            className={`h-8 w-1 shrink-0 rounded-full ${accentBarClass}`}
            aria-hidden
          />
          <div className="min-w-0 space-y-1">
            {eyebrow ? (
              <p
                className={`text-xs font-semibold ${eyebrowClassName}`}
              >
                {eyebrow}
              </p>
            ) : null}
            <Heading className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-[2rem]">
              {title}
            </Heading>
          </div>
        </div>
        {description ? (
          <p className="mt-2.5 max-w-2xl pl-4 text-[13px] leading-relaxed text-slate-500 sm:mt-3 sm:pl-4 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="-mx-4 flex shrink-0 overflow-x-auto px-4 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 lg:max-w-[42%] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2 sm:flex-wrap">{actions}</div>
        </div>
      ) : null}
    </div>
  );
}
