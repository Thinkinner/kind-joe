// components/rss-news/left-image.tsx
import type { CardGroup } from "@/lib/rss-news/type";
import SafeImage from "./safe-image";

export default function Left_Image({ data }: { data: CardGroup }) {
  const { main, links } = data;

  return (
    <div className="w-full flex flex-col justify-start items-start gap-2.5 p-4 rounded-2xl overflow-hidden">
      <div className="flex justify-between items-start gap-2.5 w-full">
        <div className="flex-1 min-w-0 leading-snug">
          <a
            href={main.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-black text-xl font-bold font-['Poppins']"
          >
            {main.title}
          </a>
        </div>

        <SafeImage
          src={main.imageUrl || null}
          alt={main.title}
          className="w-36 h-36 object-cover shrink-0 rounded"
          alwaysProxy
        />
      </div>

      <div className="border-t border-neutral-300 w-full my-2" />

      {links.slice(0, 3).map((l, i) => (
        <a
          key={i}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-black text-base font-regular font-['Poppins'] underline hover:opacity-90 line-clamp-2"
        >
          {l.title}
        </a>
      ))}

      <div className="border-t border-neutral-300 w-full mt-2" />
    </div>
  );
}
