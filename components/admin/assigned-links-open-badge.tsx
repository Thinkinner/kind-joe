"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function AssignedLinksOpenBadge() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/assigned-links?status=assigned");
        if (!res.ok) return;
        const data = (await res.json()) as { openCount?: number };
        if (!cancelled) setCount(Number(data.openCount ?? 0));
      } catch {
        // ignore
      }
    };
    void load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pathname]);

  if (count <= 0) return null;
  return (
    <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
      {count > 99 ? "99+" : count}
    </span>
  );
}
