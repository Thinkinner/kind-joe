"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { animate, motion, useMotionValue } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Minimum visible sheet height — user cannot drag the feed fully off-screen.
 * Keep in sync with globe mobile inset (`--signals-intel-peek`) on the signals page.
 */
export const MOBILE_INTEL_SHEET_MIN_VISIBLE_PX = 220;
const MIN_VISIBLE_PX = MOBILE_INTEL_SHEET_MIN_VISIBLE_PX;
const EXPANDED_FRACTION = 0.9;

type MobileIntelSheetProps = {
  isLight: boolean;
  children: ReactNode;
};

export function MobileIntelSheet({ isLight, children }: MobileIntelSheetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sheetHeight, setSheetHeight] = useState(400);
  const y = useMotionValue(0);
  /** One-time: set initial offset after first layout (mid travel so globe + feed both show). */
  const didApplyInitialOffset = useRef(false);

  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startClientY: 0,
    startOffset: 0,
  });

  const maxY = Math.max(0, sheetHeight - MIN_VISIBLE_PX);
  const maxYRef = useRef(maxY);
  maxYRef.current = maxY;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.getBoundingClientRect().height;
      const next = Math.max(
        MIN_VISIBLE_PX + 72,
        Math.round(h * EXPANDED_FRACTION),
      );
      setSheetHeight(next);
      if (!didApplyInitialOffset.current) {
        const cap = Math.max(0, next - MIN_VISIBLE_PX);
        y.set(Math.round(cap * 0.5));
        didApplyInitialOffset.current = true;
      }
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const current = y.get();
    if (current > maxY) {
      y.set(maxY);
    }
  }, [maxY, y]);

  const snapToNearest = useCallback(() => {
    const cap = maxYRef.current;
    const current = Math.min(cap, Math.max(0, y.get()));
    const mid = cap / 2;
    const target = cap <= 0 ? 0 : current > mid ? cap : 0;
    animate(y, target, { type: "spring", stiffness: 520, damping: 42 });
  }, [y]);

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const d = dragRef.current;
      d.active = true;
      d.pointerId = e.pointerId;
      d.startClientY = e.clientY;
      d.startOffset = y.get();
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [y],
  );

  const onHandlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;
      const dy = e.clientY - d.startClientY;
      const cap = maxYRef.current;
      const next = Math.min(cap, Math.max(0, d.startOffset + dy));
      y.set(next);
    },
    [y],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;
      d.active = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      d.pointerId = -1;
      snapToNearest();
    },
    [snapToNearest],
  );

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-x-0 top-0 z-[55]"
      style={{
        bottom: "calc(2.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <motion.div
        className={cn(
          "pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-full flex-col overflow-hidden rounded-none border-t shadow-lg",
          isLight
            ? "border-slate-300 bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.12)]"
            : "border-white/10 bg-[#0A0A0F] shadow-[0_-20px_50px_rgba(0,0,0,0.8)]",
        )}
        style={{
          height: sheetHeight,
          y,
        }}
      >
        <h2 className="sr-only">Intel signals feed</h2>
        <div
          tabIndex={0}
          aria-label="Resize intel feed panel"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={cn(
            "flex min-h-[56px] shrink-0 cursor-grab touch-none select-none flex-col items-center justify-center py-3.5 active:cursor-grabbing",
            isLight
              ? "bg-white active:bg-sky-50"
              : "bg-[#0A0A0F] active:bg-[#00BFFF]/10",
          )}
        >
          <div
            className={cn(
              "h-1.5 w-14 rounded-full",
              isLight ? "bg-slate-400/80 shadow-sm" : "bg-white/25 shadow-sm",
            )}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden overscroll-y-contain">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
