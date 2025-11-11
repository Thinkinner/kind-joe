// components/rss-news/right-image.tsx
import SourceBadge from './source-badge';
import type { CardGroup } from '@/lib/rss-news/type';
import SafeImage from './safe-image';

export default function Right_Image({ data }: { data: CardGroup }) {
  const { main, links } = data;
  return (
    <div className="w-full flex flex-col justify-start items-start gap-4 p-4 rounded-2xl overflow-hidden">
      <div className="w-full flex items-start gap-2.5">
        <SafeImage
          src={main.imageUrl || null}
          alt={main.title}
          className="w-36 h-36 object-cover shrink-0 rounded"
          alwaysProxy
        />
        <div className="flex-1 min-w-0">
          <a href={main.href} className="text-blue-950 text-xl font-bold font-['Poppins'] underline leading-snug line-clamp-3">
            {main.title}
          </a>
        </div>
      </div>

      <div className="border-t border-neutral-300 w-full my-2" />

      {links.slice(0, 3).map((l, i) => (
        <a key={i} href={l.href} className="w-full text-black text-base font-bold font-['Poppins'] underline hover:opacity-90 line-clamp-2">
          {l.title}
        </a>
      ))}

      <div className="border-t border-neutral-300 w-full mt-2" />
    </div>
  );
}
