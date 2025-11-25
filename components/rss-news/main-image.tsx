// components/rss-news/main-image.tsx
import type { CardGroup } from '@/lib/rss-news/type';
import SafeImage from './safe-image';

export default function Main_Image({ data }: { data: CardGroup }) {
  const { main, links } = data;

  return (
    <div className="group w-full flex flex-col justify-start items-start gap-4 p-4 rounded-2xl overflow-hidden border border-transparent hover:border-neutral-200 transition-all duration-300 hover:shadow-lg hover:bg-neutral-50/50">
      <div className="w-full flex flex-col gap-2">
        <div className="w-full rounded overflow-hidden">
          {/* Force a decent hero height even on narrow screens */}
          <div className="relative w-full aspect-[3/2] min-h-[300px]">
            {/* Wrap the image with an <a> tag */}
            <a
              href={(main as any).href ?? (main as any).link ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 w-full h-full" // Make the anchor fill the image container
            >
              <SafeImage
                src={main.imageUrl || null}
                alt={main.title}
                // Using scale-105 for the hero image so the movement isn't too overwhelming on large screens
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                alwaysProxy
              />
            </a>
          </div>
        </div>

        {/* Support either `href` (your mapper) or `link` (raw article) */}
        <a
          href={(main as any).href ?? (main as any).link ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-red-700 text-2xl font-bold font-['Poppins'] leading-snug line-clamp-3 transition-colors duration-300 group-hover:text-red-600"
        >
          {main.title}
        </a>
      </div>

      <div className="border-t border-neutral-300 w-full my-2" />

      {links.slice(0, 3).map((l, i) => (
        <a
          key={i}
          href={(l as any).href ?? (l as any).link ?? '#'}
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