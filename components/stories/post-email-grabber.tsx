"use client";

import { type FormEvent, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

type GrabberProps = {
  tags: string[];
  endpoint?: string;
  title?: string;
  subtitle?: string;
  ctaClassName?: string;
};

function EmailGrabberBase({
  tags,
  endpoint = "/api/post-email-capture",
  title = "Get top KindJoe posts in your inbox",
  subtitle = "Quick daily highlights. No spam.",
  ctaClassName = "bg-[#102A80] hover:bg-[#1A3EA0]",
}: GrabberProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

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
          tags,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Could not subscribe right now.");
        return;
      }
      toast.success("Thanks! You're subscribed.");
      setDismissed(true);
    } catch {
      toast.error("Could not subscribe right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="fixed inset-x-2 bottom-[max(8px,env(safe-area-inset-bottom))] z-50 md:inset-x-auto md:right-4 md:w-[380px]">
      <div className="rounded-2xl border border-white/30 bg-[#101217]/98 p-3.5 shadow-[0_16px_45px_rgba(0,0,0,0.7)] ring-1 ring-white/15 backdrop-blur-md">
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold leading-tight text-white">
              {title}
            </p>
            <p className="mt-0.5 text-xs text-white/75">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-md p-1.5 text-white/75 hover:bg-white/15 hover:text-white"
            aria-label="Dismiss email signup"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="py-4 h-16 min-w-0 flex-1 rounded-xl border border-white/25 bg-black/30 px-4 text-[17px] text-white placeholder:text-[16px] placeholder:text-white/60 outline-none focus:border-white/50 sm:h-11 sm:px-3.5 sm:text-base sm:placeholder:text-base"
          />
          <button
            type="submit"
            disabled={submitting || email.trim().length === 0}
            className={`h-12 rounded-xl px-5 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 ${ctaClassName}`}
          >
            {submitting ? "..." : "Join"}
          </button>
        </form>
      </div>
    </aside>
  );
}

export function PostEmailGrabber({ postId }: { postId: number }) {
  const postTag = useMemo(() => `kindjoe_post_${postId}`, [postId]);
  return <EmailGrabberBase tags={[postTag]} />;
}

export function PostsEmailGrabber() {
  return <EmailGrabberBase tags={["kindjoe_posts_feed"]} />;
}

export function VenturaPostsEmailGrabber() {
  return (
    <EmailGrabberBase
      endpoint="/api/ventura-post-email-capture"
      tags={["ventura_posts_feed"]}
      title="Get top Ventura posts in your inbox"
      subtitle="Local Ventura highlights. No spam."
      ctaClassName="bg-[#D97706] hover:bg-[#B45309]"
    />
  );
}

