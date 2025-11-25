// components/rss-news/right-image.tsx
import type { CardGroup } from "@/lib/rss-news/type";
import SafeImage from "./safe-image";

export default function Right_Image({ data }: { data: CardGroup }) {
  const { main, links } = data;

  return (
    <div className="group w-full flex flex-col justify-start items-start gap-4 p-4 rounded-2xl overflow-hidden border border-transparent hover:border-neutral-200 transition-all duration-300 hover:shadow-lg hover:bg-neutral-50/50">
      <a
        href={main.href}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-start gap-2.5"
      >
        {/* Image Wrapper for Zoom Effect */}
        <div className="w-36 h-36 shrink-0 overflow-hidden rounded">
          <SafeImage
            src={main.imageUrl || null}
            alt={main.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            alwaysProxy
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-blue-950 text-xl font-bold font-['Poppins'] leading-snug line-clamp-3 transition-colors duration-300 group-hover:text-blue-700">
            {main.title}
          </div>
        </div>
      </a>

      <div className="border-t border-neutral-300 w-full my-2" />

      {links.slice(0, 3).map((l, i) => (
        <a
          key={i}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-black text-base font-regular font-['Poppins'] underline decoration-transparent hover:decoration-current transition-all duration-200 hover:text-blue-600 hover:translate-x-1 line-clamp-2"
        >
          {l.title}
        </a>
      ))}

      <div className="border-t border-neutral-300 w-full mt-2" />
    </div>
  );
}
