import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  Facebook,
  Instagram,
  Link2,
  Mail,
  Music2,
  Globe,
  Youtube,
  Twitch,
  Twitter,
} from "lucide-react";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { socialProfileLinks, socialProfileSocialLinks, socialProfiles } from "@/db/schema";

type SocialProfilePageData = {
  id: number;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
};

type ProfileLink = {
  id: number;
  label: string;
  href: string;
  description: string | null;
  isFeatured: boolean;
  openInNewTab: boolean;
};

type SocialIconLink = {
  id: number;
  platform: string;
  label: string;
  href: string;
  openInNewTab: boolean;
};

const defaultSocialLinks: SocialIconLink[] = [
  { label: "Instagram", href: "https://www.instagram.com", icon: Instagram },
  { label: "Facebook", href: "https://www.facebook.com", icon: Facebook },
  { label: "TikTok", href: "https://www.tiktok.com", icon: Music2 },
  { label: "Website", href: "https://kindjoe.com", icon: Link2 },
  { label: "Email", href: "mailto:hello@kindjoe.com", icon: Mail },
].map((item, index) => ({
  id: index + 1,
  platform: item.label.toLowerCase(),
  label: item.label,
  href: item.href,
  openInNewTab: true,
}));

const socialIconMap = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  website: Globe,
  link: Link2,
  email: Mail,
  youtube: Youtube,
  x: Twitter,
  twitter: Twitter,
  twitch: Twitch,
} as const;

function iconForPlatform(platform: string) {
  const key = platform.trim().toLowerCase();
  return socialIconMap[key as keyof typeof socialIconMap] ?? Link2;
}

const kindjoeFallbackProfile: SocialProfilePageData = {
  id: -1,
  handle: "kindjoe",
  displayName: "KindJoe",
  bio: "Entertainment, culture, and viral moments in one place.",
  avatarUrl: "/brand/logo.svg",
};

const kindjoeFallbackLinks: ProfileLink[] = [
  {
    id: -1,
    label: "Submit Your Videos",
    href: "/profile/kindjoe/submit",
    description: "Send in your clips to get featured by our team.",
    isFeatured: true,
    openInNewTab: false,
  },
  {
    id: -2,
    label: "KindJoe Posts",
    href: "/posts",
    description: "Read the latest stories, clips, and viral updates.",
    isFeatured: false,
    openInNewTab: false,
  },
];

function defaultLinksForHandle(handle: string): ProfileLink[] {
  return [
    {
      id: -1,
      label: "Submit Your Videos",
      href: `/profile/${handle}/submit`,
      description: "Send in your clips to get featured by our team.",
      isFeatured: true,
      openInNewTab: false,
    },
    {
      id: -2,
      label: "Uncensorces Post",
      href: "/posts",
      description: "Read the latest stories, clips, and viral updates.",
      isFeatured: false,
      openInNewTab: false,
    },
  ];
}

async function getProfilePageData(handle: string): Promise<{
  profile: SocialProfilePageData;
  links: ProfileLink[];
  socialLinks: SocialIconLink[];
} | null> {
  if (!process.env.DATABASE_URL) {
    return handle === "kindjoe"
      ? {
          profile: kindjoeFallbackProfile,
          links: kindjoeFallbackLinks,
          socialLinks: defaultSocialLinks,
        }
      : null;
  }

  try {
    const [profile] = await db
      .select({
        id: socialProfiles.id,
        handle: socialProfiles.handle,
        displayName: socialProfiles.displayName,
        bio: socialProfiles.bio,
        avatarUrl: socialProfiles.avatarUrl,
      })
      .from(socialProfiles)
      .where(and(eq(socialProfiles.handle, handle), eq(socialProfiles.isActive, true)))
      .limit(1);

    if (!profile) return null;

    const links = await db
      .select({
        id: socialProfileLinks.id,
        label: socialProfileLinks.label,
        href: socialProfileLinks.href,
        description: socialProfileLinks.description,
        isFeatured: socialProfileLinks.isFeatured,
        openInNewTab: socialProfileLinks.openInNewTab,
      })
      .from(socialProfileLinks)
      .where(
        and(
          eq(socialProfileLinks.profileId, profile.id),
          eq(socialProfileLinks.isActive, true),
        ),
      )
      .orderBy(
        desc(socialProfileLinks.isFeatured),
        asc(socialProfileLinks.order),
        desc(socialProfileLinks.id),
      );

    const socialLinks = await db
      .select({
        id: socialProfileSocialLinks.id,
        platform: socialProfileSocialLinks.platform,
        label: socialProfileSocialLinks.label,
        href: socialProfileSocialLinks.href,
        openInNewTab: socialProfileSocialLinks.openInNewTab,
      })
      .from(socialProfileSocialLinks)
      .where(
        and(
          eq(socialProfileSocialLinks.profileId, profile.id),
          eq(socialProfileSocialLinks.isActive, true),
        ),
      )
      .orderBy(
        asc(socialProfileSocialLinks.order),
        asc(socialProfileSocialLinks.id),
      );

    return {
      profile,
      links: links.length > 0 ? links : defaultLinksForHandle(handle),
      socialLinks: socialLinks.length > 0 ? socialLinks : defaultSocialLinks,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const isMissingNewTables =
      message.includes("social_profiles") || message.includes("social_profile_links");
    if (isMissingNewTables && handle === "kindjoe") {
      return {
        profile: kindjoeFallbackProfile,
        links: kindjoeFallbackLinks,
        socialLinks: defaultSocialLinks,
      };
    }
    console.error("social profile page query failed:", error);
    return null;
  }
}

export default async function SocialProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const normalizedHandle = handle.trim().toLowerCase();

  const data = await getProfilePageData(normalizedHandle);
  if (!data) {
    notFound();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_42%),radial-gradient(circle_at_80%_20%,_rgba(168,85,247,0.2),_transparent_35%)]" />

      <section className="relative mx-auto w-full max-w-xl">
        <div className="overflow-hidden rounded-3xl border border-white/12 bg-white/[0.06] p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-8">
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl border border-white/20 bg-white/90">
            <Image
              src={data.profile.avatarUrl || "/brand/logo.svg"}
              alt={data.profile.displayName}
              width={80}
              height={80}
              className="h-full w-full object-contain p-2"
              priority
            />
          </div>

          <div className="mt-5 text-center">
            <p className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
              <BadgeCheck className="h-3.5 w-3.5" />
              Official
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {data.profile.displayName}
            </h1>
            {data.profile.bio ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                {data.profile.bio}
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {data.socialLinks.map((item) => {
              const Icon = iconForPlatform(item.platform);
              const isExternal =
                item.openInNewTab ||
                item.href.startsWith("http") ||
                item.href.startsWith("mailto:");
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer noopener" : undefined}
                  aria-label={item.label}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white transition hover:border-white/40 hover:bg-black/65"
                >
                  <Icon className="h-4.5 w-4.5" />
                </Link>
              );
            })}
          </div>

          <div className="mt-7 space-y-3">
            {data.links.map((item) => {
              const isExternal =
                item.openInNewTab ||
                item.href.startsWith("http") ||
                item.href.startsWith("mailto:");

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer noopener" : undefined}
                  className={[
                    "group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-200",
                    item.isFeatured
                      ? "border-sky-200/30 bg-gradient-to-r from-sky-500/30 to-violet-500/30 hover:from-sky-500/45 hover:to-violet-500/45"
                      : "border-white/12 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.08]",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/20 text-slate-100">
                      <Link2 className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white sm:text-[15px]">
                        {item.label}
                      </p>
                      {item.description ? (
                        <p className="truncate text-xs text-slate-300">{item.description}</p>
                      ) : null}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-200 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
