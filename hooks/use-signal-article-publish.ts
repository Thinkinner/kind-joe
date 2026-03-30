"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Signal } from "@/lib/aggregator/types";

const slugStorageKey = (signalId: string) => `kj-signal-article-slug-${signalId}`;

type Status = "idle" | "loading" | "error";

export function useSignalArticlePublish(selectedSignal: Signal | null) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cachedSlug, setCachedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSignal) {
      setCachedSlug(null);
      setStatus("idle");
      setError(null);
      return;
    }

    if (typeof window === "undefined") return;

    const slug = sessionStorage.getItem(slugStorageKey(selectedSignal.id));
    setCachedSlug(slug || null);
    setStatus("idle");
    setError(null);
  }, [selectedSignal]);

  const publishOrOpen = useCallback(async () => {
    if (!selectedSignal) return;

    if (cachedSlug) {
      router.push(`/${cachedSlug}`);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/signals/publish-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: selectedSignal }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Something went wrong. Try again.";
        setStatus("error");
        setError(msg);
        return;
      }

      const slug = typeof data.slug === "string" ? data.slug : null;
      if (!slug) {
        setStatus("error");
        setError("No article link returned.");
        return;
      }

      sessionStorage.setItem(slugStorageKey(selectedSignal.id), slug);
      setCachedSlug(slug);
      setStatus("idle");
      router.push(`/${slug}`);
    } catch {
      setStatus("error");
      setError("Network error. Check connection and retry.");
    }
  }, [selectedSignal, cachedSlug, router]);

  return { status, error, cachedSlug, publishOrOpen };
}
