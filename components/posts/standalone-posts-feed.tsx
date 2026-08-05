"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { toast } from "sonner";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import { VenturaBusinessInquiryForm } from "@/components/ventura/ventura-business-inquiry-form";

type PostCard = { id: number; imageUrl: string; destinationUrl: string };

type StandalonePostsFeedProps = {
  allPosts: PostCard[];
  profileImageSrc: string;
  profileName: string;
  subscribeTitle: string;
  subscribeEndpoint: string;
  subscribeTags: string[];
  subscribeButtonClassName: string;
  profileImageClassName?: string;
  showBusinessPromo?: boolean;
};

const PAGE_SIZE = 12;

export function StandalonePostsFeed({
  allPosts,
  profileImageSrc,
  profileName,
  subscribeTitle,
  subscribeEndpoint,
  subscribeTags,
  subscribeButtonClassName,
  profileImageClassName,
  showBusinessPromo = false,
}: StandalonePostsFeedProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const visiblePosts = allPosts.slice(0, visibleCount);
  const hasMore = visibleCount < allPosts.length;
  const gridPosts = visiblePosts;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || loadingRef.current) return;

        loadingRef.current = true;
        setLoadingMore(true);
        window.setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, allPosts.length));
          loadingRef.current = false;
          setLoadingMore(false);
        }, 150);
      },
      {
        root: null,
        // Start loading before the user fully hits the bottom.
        rootMargin: "0px 0px 360px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [allPosts.length, hasMore]);

  return (
    <div className="space-y-3 px-2 pb-8 sm:px-0">
      <header className="pb-2 pt-2 text-center sm:pt-4">
        <div className="mb-3 inline-flex items-center gap-2.5">
          <Image
            src={profileImageSrc}
            width={44}
            height={44}
            alt={profileName}
            className={`h-11 w-11 rounded-full object-cover ${profileImageClassName ?? ""}`}
          />
          <p className="text-base font-semibold text-neutral-900">{profileName}</p>
        </div>
        {showBusinessPromo ? <BusinessPromoCta /> : null}
        <p className="mt-3 text-[15px] text-neutral-600">
          Click on media to learn more
        </p>
      </header>

      <InlineSubscribePanel
        title={subscribeTitle}
        endpoint={subscribeEndpoint}
        tags={subscribeTags}
        buttonClassName={subscribeButtonClassName}
      />

      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {gridPosts.map((post) => (
          <Link
            key={post.id}
            href={post.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-[4/5] overflow-hidden bg-gray-50"
          >
            <Image
              src={optimizeCloudinaryUrl(post.imageUrl, {
                transforms: ["ar_4:5", "c_fill", "g_auto", "w_800"],
              })}
              fill
              alt=""
              className="object-cover transition duration-500 ease-in-out group-hover:scale-105"
              sizes="(max-width: 768px) 33vw, 360px"
            />
          </Link>
        ))}
      </div>

      <div ref={sentinelRef} className="h-6 w-full" aria-hidden />
      {loadingMore ? (
        <p className="text-center text-sm text-neutral-500">Loading more posts...</p>
      ) : null}
    </div>
  );
}

function BusinessPromoCta() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <p className="mx-auto max-w-md text-[15px] leading-relaxed text-neutral-700">
        Are you a business owner and want to promote your business?{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-semibold text-[#D97706] underline underline-offset-2 transition-colors hover:text-[#B45309]"
        >
          Click here
        </button>
      </p>
      {open ? <BusinessInquiryModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function BusinessInquiryModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-0 backdrop-blur-[2px] sm:items-center sm:px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ventura-business-inquiry-title"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-orange-100 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#D97706]">
              Local business promo
            </p>
            <h2
              id="ventura-business-inquiry-title"
              className="mt-1 text-2xl font-bold tracking-tight text-neutral-950"
            >
              Tell us about your business
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
              We&apos;ll follow up about getting you in front of Ventura
              readers.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <VenturaBusinessInquiryForm
          source="ventura_posts_modal"
          compact
          onSuccess={onClose}
        />
      </div>
    </div>
  );
}

function InlineSubscribePanel({
  title,
  endpoint,
  tags,
  buttonClassName,
}: {
  title: string;
  endpoint: string;
  tags: string[];
  buttonClassName: string;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const normalizedTags = useMemo(() => tags, [tags]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          tags: normalizedTags,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Could not subscribe right now.");
        return;
      }
      toast.success("Thanks! You're subscribed.");
      setEmail("");
    } catch {
      toast.error("Could not subscribe right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="border border-neutral-200 bg-white px-3 py-5 sm:px-6">
      <p className="text-center text-[18px] text-neutral-700">{title}</p>
      <form
        onSubmit={onSubmit}
        className="mx-auto mt-4 flex max-w-[560px] flex-col gap-2.5 sm:flex-row"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="py-4 h-11 min-w-0 flex-1 border border-neutral-300 px-4 text-base outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          disabled={submitting || email.trim().length === 0}
          className={`h-11 px-6 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName}`}
        >
          {submitting ? "..." : "Subscribe"}
        </button>
      </form>
      <p className="mt-3 text-center text-sm text-neutral-600">
        By submitting your email address you agree to our{" "}
        <Link href="/privacy-policy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </section>
  );
}
