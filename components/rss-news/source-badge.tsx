// components/rss-news/sourceBadge.tsx
'use client';
import { SOURCE_LOGOS } from '@/lib/rss-news/image-check';

export default function SourceBadge({ sourceName }: { sourceName: string }) {
  const logo = SOURCE_LOGOS[sourceName] ?? '/logos/default.png';
  return (
    <div className="flex items-center gap-2">
      <img src={logo} alt={sourceName} className="w-6 h-6 rounded" />
      <span className="text-xs text-neutral-600">{sourceName}</span>
    </div>
  );
}
