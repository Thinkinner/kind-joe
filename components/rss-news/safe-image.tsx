// components/rss-news/SafeImage.tsx
'use client';
import { JSX, useEffect, useRef, useState } from 'react';

type Props = Omit<JSX.IntrinsicElements['img'], 'src' | 'onError' | 'onLoad'> & {
  src: string | null | undefined;
  fallbackSrc?: string;
  timeoutMs?: number;
  alwaysProxy?: boolean; // default true now that we filter for usable images
};

export default function SafeImage({
  src,
  fallbackSrc = '/img/placeholder-148x148.png',
  timeoutMs = 6000,
  alwaysProxy = true,
  ...imgProps
}: Props) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!src) {
      setCurrentSrc(fallbackSrc);
      setFailed(true);
      return;
    }
    // we now default to proxying immediately; we already prevalidated server-side
    const url = alwaysProxy ? `/api/image-proxy?url=${encodeURIComponent(src)}` : src;
    setCurrentSrc(url);
    setFailed(false);

    timerRef.current = window.setTimeout(() => {
      setFailed(true);
      setCurrentSrc(fallbackSrc);
    }, timeoutMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [src, fallbackSrc, timeoutMs, alwaysProxy]);

  function handleLoad() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }

  function handleError() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setFailed(true);
    setCurrentSrc(fallbackSrc);
  }

  return (
    <img
      {...imgProps}
      src={currentSrc || fallbackSrc}
      onLoad={handleLoad}
      onError={handleError}
      data-failed={failed ? 'true' : 'false'}
      alt={imgProps.alt}
    />
  );
}
