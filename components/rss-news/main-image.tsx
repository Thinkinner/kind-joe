import type { CardGroup } from '@/lib/rss-news/type';
import SafeImage from './safe-image';

export default function Main_Image({ data }: { data: CardGroup }) {
  const { main, links } = data;

  return (
    <div className="w-full flex flex-col justify-start items-start gap-4 p-4 rounded-2xl overflow-hidden">
      <div className="w-full flex flex-col gap-2">
        <div className="w-full rounded overflow-hidden">
          {/* Force a decent hero height even on narrow screens */}
          <div className="relative w-full aspect-[3/2] min-h-[300px]">
            <SafeImage
              src={main.imageUrl || null}
              alt={main.title}
              className="absolute inset-0 w-full h-full object-cover"
              alwaysProxy
            />
          </div>
        </div>

        {/* Support either `href` (your mapper) or `link` (raw article) */}
        <a
          href={(main as any).href ?? (main as any).link ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-red-700 text-2xl font-bold font-['Poppins'] underline leading-snug line-clamp-3"
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
          className="w-full text-black text-base font-bold font-['Poppins'] underline hover:opacity-90 line-clamp-2"
        >
          {l.title}
        </a>
      ))}

      <div className="border-t border-neutral-300 w-full mt-2" />
    </div>
  );
}
