export type DeveloperDocsNavItem = {
  title: string;
  href: string;
  description?: string;
};

export type DeveloperDocsNavSection = {
  title: string;
  items: DeveloperDocsNavItem[];
};

export const developerDocsNav: DeveloperDocsNavSection[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Documentation Home",
        href: "/developers",
        description: "Start here for platform overview and quick links.",
      },
      {
        title: "Getting Started",
        href: "/developers/getting-started",
        description: "Integration basics and first API request.",
      },
      {
        title: "KindJoe post cards",
        href: "/developers/kindjoe-posts",
        description: "Feed tiles schema, article editor flow, and DB notes.",
      },
    ],
  },
  {
    title: "APIs",
    items: [
      {
        title: "Ventura Content API",
        href: "/developers/apis/ventura-content",
        description: "Read-only API for Ventura stories.",
      },
    ],
  },
  {
    title: "Updates",
    items: [
      {
        title: "Changelog",
        href: "/developers/changelog",
        description: "Recent API and documentation updates.",
      },
    ],
  },
];

export const developerDocsHomeHref = "/developers";

export function normalizeDocsPathname(pathname: string): string {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isDocsHrefActive(pathname: string, href: string): boolean {
  const normalizedPath = normalizeDocsPathname(pathname);
  const normalizedHref = normalizeDocsPathname(href);
  if (normalizedPath === normalizedHref) return true;
  if (normalizedHref === developerDocsHomeHref) return false;
  return normalizedPath.startsWith(`${normalizedHref}/`);
}

export function getDocsNavItemByPathname(
  pathname: string,
): DeveloperDocsNavItem | null {
  const normalizedPath = normalizeDocsPathname(pathname);
  for (const section of developerDocsNav) {
    const match = section.items.find(
      (item) => normalizeDocsPathname(item.href) === normalizedPath,
    );
    if (match) return match;
  }
  return null;
}

export function getDocsBreadcrumb(
  pathname: string,
): Array<{ title: string; href?: string }> {
  const match = getDocsNavItemByPathname(pathname);
  if (!match || normalizeDocsPathname(match.href) === developerDocsHomeHref) {
    return [{ title: "Developers" }];
  }
  return [{ title: "Developers", href: developerDocsHomeHref }, { title: match.title }];
}
