"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";

const VIDEO_SRC =
  "https://res.cloudinary.com/dtoqunhcm/video/upload/v1789744050/0918_1_xgxl3g.mp4";
const DISMISS_KEY = "kj_video_modal_ad_dismissed";

export function VideoModalAd() {
  const [phase, setPhase] = useState<"idle" | "loading" | "open">("idle");
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // Private mode can block storage; still load the ad.
    }
    setPhase("loading");
  }, []);

  useEffect(() => {
    if (phase !== "loading") return;
    const video = videoRef.current;
    if (video && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      setPhase("open");
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "open") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      setMuted(false);
      void video.play().catch(() => {
        video.muted = true;
        setMuted(true);
        void video.play().catch(() => {});
      });
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [phase]);

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
    videoRef.current?.pause();
    setPhase("idle");
  }

  function handleCanPlay() {
    setPhase((current) => (current === "loading" ? "open" : current));
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted) {
      void video.play().catch(() => {});
    }
  }

  if (phase === "idle") return null;

  const open = phase === "open";

  return (
    <div
      className={
        open
          ? "fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[2px]"
          : "pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
      }
      aria-hidden={!open}
      onClick={open ? dismiss : undefined}
    >
      <div
        role="dialog"
        aria-modal={open}
        aria-label="Advertisement"
        className="relative w-full max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        {open ? (
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
              Advertisement
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-900 shadow-sm transition hover:bg-neutral-100"
              aria-label="Close advertisement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className={open ? "overflow-hidden rounded-2xl bg-black shadow-2xl" : undefined}>
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            preload="auto"
            muted={muted}
            playsInline
            loop
            controls={open}
            onCanPlay={handleCanPlay}
            className={
              open
                ? "max-h-[78dvh] w-full bg-black object-contain"
                : "h-px w-px"
            }
          />
        </div>

        {open ? (
          <button
            type="button"
            onClick={toggleMute}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm transition hover:bg-white"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            {muted ? "Unmute" : "Mute"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
