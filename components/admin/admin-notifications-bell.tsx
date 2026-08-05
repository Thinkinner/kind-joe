"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  unread: boolean;
};

export function AdminNotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        unreadCount?: number;
        items?: NotificationItem[];
      };
      setUnreadCount(data.unreadCount ?? 0);
      setItems(data.items ?? []);
    } catch {
      // ignore polling errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
    }, 45000);
    return () => window.clearInterval(id);
  }, [load]);

  async function markRead(notificationId: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, unread: false } : item,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", notificationId }),
    }).catch(() => undefined);
  }

  async function markAllRead() {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
    setUnreadCount(0);
    await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    }).catch(() => undefined);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground transition hover:bg-muted"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          items.map((item) => {
            const content = (
              <div className="flex min-w-0 flex-col gap-0.5 py-1">
                <span
                  className={`text-sm ${
                    item.unread ? "font-semibold text-foreground" : "font-medium"
                  }`}
                >
                  {item.title}
                </span>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {item.body}
                </span>
                <span className="text-[11px] text-muted-foreground/80">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            );

            if (item.href) {
              return (
                <DropdownMenuItem key={item.id} asChild>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (item.unread) void markRead(item.id);
                    }}
                    className="cursor-pointer"
                  >
                    {content}
                  </Link>
                </DropdownMenuItem>
              );
            }

            return (
              <DropdownMenuItem
                key={item.id}
                onSelect={() => {
                  if (item.unread) void markRead(item.id);
                }}
              >
                {content}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
