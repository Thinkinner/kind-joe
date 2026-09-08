import type { CSSProperties } from "react";

type MarqueeProps = {
  items: string[];
  /** Seconds for one full loop. */
  speed?: number;
};

function Track({ items }: { items: string[] }) {
  return (
    <div className="flex shrink-0 items-center gap-10 pr-10" aria-hidden="true">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-10 text-xs font-bold uppercase tracking-[0.22em] whitespace-nowrap"
        >
          {item}
          <span aria-hidden="true">✦</span>
        </span>
      ))}
    </div>
  );
}

export function JoesFriendsMarquee({ items, speed = 26 }: MarqueeProps) {
  return (
    <div className="overflow-hidden">
      <div
        className="flex w-max animate-jf-marquee motion-reduce:animate-none"
        style={{ "--jf-marquee-duration": `${speed}s` } as CSSProperties}
      >
        <Track items={items} />
        <Track items={items} />
      </div>
      <span className="sr-only">{items.join(", ")}</span>
    </div>
  );
}
