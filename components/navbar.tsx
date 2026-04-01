"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Search, LogIn, Shield, Settings } from "lucide-react";
// Kind Joe Watch live pill — re-enable with Eye import and hook below.
// import {
//   formatSignalsViewerCount,
//   useSignalsLiveViewers,
// } from "@/hooks/use-signals-live-viewers";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import SearchModal from "@/components/modals/search-modal";
import { authClient } from "@/lib/auth-client";
import { getAccountType } from "@/lib/auth/account-type";
import {
  clearNavSessionHint,
  peekNavSessionHint,
} from "@/lib/auth/nav-session-hint";

const navProfileBtnClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-black/40 text-zinc-400 transition-colors hover:border-red-500/35 hover:bg-black/60 hover:text-white lg:h-9 lg:w-9 lg:rounded-lg";

export type NavbarSessionUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  username?: string | null;
  accountType?: string | null;
  staffRole?: string | null;
};

/** Session `user` from the client includes custom fields at runtime; Better Auth types omit `username`. */
function usernameFromSessionUser(
  u: NavbarSessionUser | object | undefined | null,
): string | null {
  if (!u || typeof u !== "object") return null;
  const raw = (u as { username?: unknown }).username;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

type NavbarProps = {
  /** From RSC `getServerSession()` so the bar matches cookies on first paint. */
  initialSessionUser?: NavbarSessionUser | null;
};

export default function Navbar({
  initialSessionUser = null,
}: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  // const signalsViewers = useSignalsLiveViewers();
  // const signalsWatchHref = "/kindjoe-watch";
  const { data: sessionData, isPending: sessionPending, refetch } =
    authClient.useSession();

  /** Must not read sessionStorage during SSR / hydration — it differs from server and causes mismatches. */
  const [navReady, setNavReady] = useState(false);
  const [hintUser, setHintUser] = useState<NavbarSessionUser | null>(null);

  const serverUser =
    initialSessionUser?.id && initialSessionUser.id.length > 0
      ? initialSessionUser
      : null;
  const authedUser =
    sessionData?.user ?? serverUser ?? hintUser ?? undefined;
  const accountKind = getAccountType(authedUser);
  const profileHref = accountKind === "staff" ? "/admin" : "/account/profile";
  const profileLabel =
    accountKind === "staff" ? "Admin dashboard" : "Profile";
  const handle = usernameFromSessionUser(authedUser ?? null);
  const profileTitle = handle ? `${profileLabel} (@${handle})` : profileLabel;
  const authLoading =
    (!navReady && !serverUser) ||
    (sessionPending &&
      !serverUser &&
      !(hintUser?.id && hintUser.id.length > 0));

  useEffect(() => {
    const hint = peekNavSessionHint();
    setHintUser(
      hint?.id
        ? {
            ...hint,
            image: null as string | null,
          }
        : null,
    );
    setNavReady(true);
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sid = sessionData?.user?.id;
    const hasSessionUser = typeof sid === "string" && sid.length > 0;
    const hasServerUser = Boolean(serverUser?.id && serverUser.id.length > 0);
    if (!hasSessionUser && !hasServerUser) return;
    clearNavSessionHint();
    setHintUser(null);
  }, [serverUser?.id, sessionData?.user?.id]);

  const links = [
    { name: "Home", href: "/" },
    { name: "Featured", href: "/news", title: "KJ Featured Articles" },
    { name: "News Predictions", href: "/predictions" },
    { name: "Ventura County", href: "/ventura-county" },
    { name: "Watch", href: "/kindjoe-watch", title: "Kind Joe Watch" },
  ] as const;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open || searchOpen ? "hidden" : "auto";
  }, [open, searchOpen]);

  /* Kind Joe Watch live viewer pill — restore with useSignalsLiveViewers + Eye icon.
  const livePillBoxClass =
    "max-w-full items-center gap-2 rounded-full border border-red-500/40 bg-gradient-to-b from-red-950/55 to-red-950/20 px-2.5 py-1.5 shadow-[0_0_20px_rgba(220,38,38,0.12)] transition-colors hover:border-red-500/55 hover:from-red-950/70 hover:to-red-950/30 sm:gap-2.5 sm:px-3 sm:py-1.5";

  const livePillInner = (
    <>
      <span className="relative flex h-2 w-2 shrink-0 sm:h-2.5 sm:w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/45" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] sm:h-2.5 sm:w-2.5" />
      </span>
      <span className="shrink-0 text-[9px] font-black tracking-[0.22em] text-red-500 sm:text-[10px] sm:tracking-[0.26em]">
        LIVE
      </span>
      <Eye
        className="hidden h-[15px] w-[15px] shrink-0 text-red-400 sm:block sm:h-[17px] sm:w-[17px]"
        aria-hidden
      />
      <span className="truncate font-mono text-sm font-bold tabular-nums text-white sm:text-base">
        {formatSignalsViewerCount(signalsViewers)}
      </span>
      <span className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.1em] text-red-200/85 sm:text-[9px] sm:tracking-[0.12em]">
        watching
      </span>
    </>
  );
  */

  return (
    <>
      <header className="sticky top-0 z-[60] border-b border-white/[0.04] bg-[#030304] shadow-[0_16px_48px_rgba(0,0,0,0.65)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/25 to-transparent" />

        <nav className="relative mx-auto max-w-[1440px] px-3 pb-3 sm:px-5 lg:px-8 lg:pb-0">
          {/* Main bar */}
          <div className="flex h-[3.25rem] items-center justify-between gap-3 sm:h-14 lg:h-[3.75rem]">
            <Link
              href="/"
              className="flex min-w-0 shrink-0 items-center rounded-lg outline-none ring-red-500/0 transition ring-offset-2 ring-offset-[#030304] focus-visible:ring-2"
            >
              <Image
                src="/brand/horizontal-logo.svg"
                width={120}
                height={28}
                alt="Kind Joe"
                className="h-auto w-[100px] sm:w-[118px] lg:w-[138px]"
                priority
              />
            </Link>

            {/* Desktop navigation */}
            <div className="hidden flex-1 justify-center lg:flex">
              <div className="flex items-center gap-1 rounded-full border border-white/[0.05] bg-black/55 p-1">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      title={"title" in link ? link.title : undefined}
                      className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:px-4 ${
                        isActive
                          ? "bg-white/[0.08] text-white shadow-inner shadow-black/40"
                          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Kind Joe Watch desktop pill
              <Link
                href={signalsWatchHref}
                className={`${livePillBoxClass} hidden lg:inline-flex`}
                title="Open Kind Joe Watch live feed"
              >
                {livePillInner}
              </Link>
              */}

              {authLoading ? (
                <span
                  className="inline-block h-10 w-10 shrink-0 animate-pulse rounded-xl bg-white/[0.06] lg:h-9 lg:w-9 lg:rounded-lg"
                  aria-hidden
                />
              ) : authedUser ? (
                accountKind === "staff" ? (
                  <Link
                    href={profileHref}
                    className={navProfileBtnClass}
                    title={profileTitle}
                    aria-label={profileTitle}
                  >
                    <Shield
                      className="h-[18px] w-[18px] lg:h-[17px] lg:w-[17px]"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </Link>
                ) : typeof authedUser.image === "string" &&
                  authedUser.image.length > 0 ? (
                  <span className="flex items-center gap-2">
                    <Link
                      href={profileHref}
                      className={navProfileBtnClass}
                      title={profileTitle}
                      aria-label={profileTitle}
                    >
                      {
                        // eslint-disable-next-line @next/next/no-img-element -- OAuth avatars use varied hosts
                        <img
                          src={authedUser.image}
                          alt=""
                          className="h-[1.35rem] w-[1.35rem] rounded-full object-cover ring-1 ring-white/10 lg:h-5 lg:w-5"
                          referrerPolicy="no-referrer"
                        />
                      }
                    </Link>
                    <Link
                      href={profileHref}
                      className={navProfileBtnClass}
                      title={profileTitle}
                      aria-label={profileTitle}
                    >
                      <Settings
                        className="h-[18px] w-[18px] lg:h-[17px] lg:w-[17px]"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </Link>
                  </span>
                ) : (
                  <Link
                    href={profileHref}
                    className={navProfileBtnClass}
                    title={profileTitle}
                    aria-label={profileTitle}
                  >
                    <Settings
                      className="h-[18px] w-[18px] lg:h-[17px] lg:w-[17px]"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </Link>
                )
              ) : (
                <Link
                  href="/login"
                  className={navProfileBtnClass}
                  title="Sign in"
                  aria-label="Sign in"
                >
                  <LogIn
                    className="h-[18px] w-[18px] lg:h-[17px] lg:w-[17px]"
                    strokeWidth={2}
                    aria-hidden
                  />
                </Link>
              )}

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                title="Search (⌘K)"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-black/40 text-zinc-500 transition-colors hover:border-red-500/35 hover:bg-black/60 hover:text-red-400 lg:h-9 lg:w-9 lg:rounded-lg"
                aria-label="Search articles"
              >
                <Search className="h-[18px] w-[18px] lg:h-[17px] lg:w-[17px]" strokeWidth={2} />
              </button>

              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((s) => !s)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-black/40 text-zinc-300 transition-colors hover:border-red-500/30 hover:bg-black/55 hover:text-red-400 lg:hidden"
              >
                {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Kind Joe Watch mobile full-width pill
          <Link
            href={signalsWatchHref}
            className={`${livePillBoxClass} mb-3 flex w-full justify-center lg:hidden`}
            title="Open Kind Joe Watch live feed"
          >
            {livePillInner}
          </Link>
          */}
        </nav>
      </header>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
              aria-hidden
            />

            <motion.aside
              key="sidebar"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-[90] flex h-[100dvh] max-h-[100dvh] w-full max-w-sm flex-col border-l border-white/[0.05] bg-[#020203] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl lg:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <Image
                  src="/brand/horizontal-logo.svg"
                  width={130}
                  height={30}
                  alt="Kind Joe"
                  className="h-auto w-[120px]"
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-black/35 text-zinc-400 transition-colors hover:border-red-500/30 hover:bg-black/50 hover:text-red-400"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSearchOpen(true);
                }}
                className="mb-6 flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-black/40 p-3.5 text-left text-zinc-500 transition-colors hover:border-red-500/25 hover:bg-black/55 hover:text-zinc-200"
              >
                <Search className="h-5 w-5 shrink-0 text-zinc-500" />
                <span className="text-sm font-medium">Search articles…</span>
              </button>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {[
                  { name: "Home", href: "/" },
                  { name: "KJ Featured Articles", href: "/news" },
                  { name: "News Predictions", href: "/predictions" },
                  { name: "Ventura County", href: "/ventura-county" },
                  { name: "Kind Joe Watch", href: "/kindjoe-watch" },
                ].map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center rounded-xl px-3 py-3.5 text-base font-semibold transition-colors ${
                        isActive
                          ? "bg-white/[0.06] text-red-400"
                          : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
                {!authLoading && authedUser ? (
                  <Link
                    href={profileHref}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/[0.07]"
                  >
                    {typeof authedUser.image === "string" &&
                    authedUser.image.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element -- OAuth avatars use varied hosts
                      <img
                        src={authedUser.image}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                        referrerPolicy="no-referrer"
                      />
                    ) : accountKind === "staff" ? (
                      <Shield
                        className="h-6 w-6 shrink-0 text-zinc-400"
                        aria-hidden
                      />
                    ) : (
                      <Settings
                        className="h-6 w-6 shrink-0 text-zinc-400"
                        aria-hidden
                      />
                    )}
                    <span>{profileLabel}</span>
                  </Link>
                ) : !authLoading ? (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/[0.07]"
                  >
                    Sign in
                  </Link>
                ) : null}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
