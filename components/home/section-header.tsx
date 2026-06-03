import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  as?: "h1" | "h2";
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  as: Heading = "h2",
}: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-slate-200/70 pb-5 sm:mb-8 sm:gap-5 sm:pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-1.5 sm:space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-600">
            {eyebrow}
          </p>
        ) : null}
        <Heading className="font-[Poppins] text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-[1.75rem] lg:text-3xl">
          {title}
        </Heading>
        {description ? (
          <p className="max-w-2xl text-[13px] leading-relaxed text-slate-600 sm:text-sm md:text-[15px]">
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
