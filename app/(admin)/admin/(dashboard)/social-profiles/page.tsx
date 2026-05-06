"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SocialProfile = {
  id: number;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string | null;
};

type ProfileLink = {
  id: number;
  profileId: number;
  label: string;
  href: string;
  description: string | null;
  order: number;
  isActive: boolean;
  isFeatured: boolean;
  openInNewTab: boolean;
  createdAt: string | null;
};

type SocialIconLink = {
  id: number;
  profileId: number;
  platform: string;
  label: string;
  href: string;
  order: number;
  isActive: boolean;
  openInNewTab: boolean;
  createdAt: string | null;
};

type CreateProfileForm = {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  isActive: boolean;
};

type ProfileLinkForm = {
  label: string;
  href: string;
  description: string;
  order: string;
  isActive: boolean;
  isFeatured: boolean;
  openInNewTab: boolean;
};

type SocialIconLinkForm = {
  platform: string;
  label: string;
  href: string;
  order: string;
  isActive: boolean;
  openInNewTab: boolean;
};

function normalizeOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function resolvePublicOriginFromWindow(): string {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, port } = window.location;
  const portPart = port ? `:${port}` : "";

  if (hostname === "admin.localhost") return `${protocol}//localhost${portPart}`;
  if (hostname.startsWith("admin.")) {
    return `${protocol}//${hostname.replace(/^admin\./, "")}${portPart}`;
  }
  return `${protocol}//${hostname}${portPart}`;
}

const initialProfileForm: CreateProfileForm = {
  handle: "",
  displayName: "",
  bio: "",
  avatarUrl: "",
  isActive: true,
};

const initialLinkForm: ProfileLinkForm = {
  label: "",
  href: "",
  description: "",
  order: "0",
  isActive: true,
  isFeatured: false,
  openInNewTab: false,
};

const initialSocialIconForm: SocialIconLinkForm = {
  platform: "instagram",
  label: "",
  href: "",
  order: "0",
  isActive: true,
  openInNewTab: true,
};

type LinkPreset = {
  id: string;
  label: string;
  description: string;
  build: (profileHandle: string, nextOrder: number) => ProfileLinkForm;
};

type SocialPreset = {
  id: string;
  label: string;
  platform: string;
  buildHref: (profileHandle: string) => string;
};

const LINK_PRESETS: LinkPreset[] = [
  {
    id: "submit-videos",
    label: "Submit Your Videos",
    description: "Default clip submission card",
    build: (profileHandle, nextOrder) => ({
      label: "Submit Your Videos",
      href: `/profile/${profileHandle}/submit`,
      description: "Send in your clips to get featured by our team.",
      order: String(nextOrder),
      isActive: true,
      isFeatured: true,
      openInNewTab: false,
    }),
  },
  {
    id: "latest-posts",
    label: "Uncensorces Post",
    description: "Main content feed card",
    build: (_profileHandle, nextOrder) => ({
      label: "Uncensorces Post",
      href: "/posts",
      description: "Read the latest stories, clips, and viral updates.",
      order: String(nextOrder),
      isActive: true,
      isFeatured: false,
      openInNewTab: false,
    }),
  },
  {
    id: "external-site",
    label: "Official Website",
    description: "External website card",
    build: (profileHandle, nextOrder) => ({
      label: "Official Website",
      href: `https://${profileHandle}.com`,
      description: "Visit the official website.",
      order: String(nextOrder),
      isActive: true,
      isFeatured: false,
      openInNewTab: true,
    }),
  },
];

const SOCIAL_PRESETS: SocialPreset[] = [
  {
    id: "instagram",
    label: "Instagram",
    platform: "instagram",
    buildHref: (profileHandle) => `https://instagram.com/${profileHandle}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    platform: "facebook",
    buildHref: (profileHandle) => `https://facebook.com/${profileHandle}`,
  },
  {
    id: "tiktok",
    label: "TikTok",
    platform: "tiktok",
    buildHref: (profileHandle) => `https://tiktok.com/@${profileHandle}`,
  },
  {
    id: "youtube",
    label: "YouTube",
    platform: "youtube",
    buildHref: (profileHandle) => `https://youtube.com/@${profileHandle}`,
  },
  {
    id: "x",
    label: "X / Twitter",
    platform: "x",
    buildHref: (profileHandle) => `https://x.com/${profileHandle}`,
  },
  {
    id: "website",
    label: "Website",
    platform: "website",
    buildHref: (profileHandle) => `https://${profileHandle}.com`,
  },
  {
    id: "email",
    label: "Email",
    platform: "email",
    buildHref: (profileHandle) => `mailto:hello@${profileHandle}.com`,
  },
];

function StatusPill({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium",
        active
          ? "border-primary/35 bg-primary/10 text-primary"
          : "border-border bg-muted/70 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function TogglePill({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        checked
          ? "border-primary/35 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-muted/70",
      )}
    >
      {label}
    </button>
  );
}

function SectionToggle({
  title,
  subtitle,
  isOpen,
  onToggle,
  rightContent,
}: {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  rightContent?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 text-left"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span>
          <span className="block text-base font-semibold text-foreground">{title}</span>
          {subtitle ? <span className="block text-xs text-muted-foreground">{subtitle}</span> : null}
        </span>
      </button>
      {rightContent}
    </div>
  );
}

export default function AdminSocialProfilesPage() {
  const [publicSiteOrigin, setPublicSiteOrigin] = useState<string | null>(() =>
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL),
  );
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<CreateProfileForm>(initialProfileForm);

  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedProfileDraft, setSelectedProfileDraft] = useState<CreateProfileForm | null>(null);
  const [savingSelectedProfile, setSavingSelectedProfile] = useState(false);

  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [savingLink, setSavingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
  const [linkForm, setLinkForm] = useState<ProfileLinkForm>(initialLinkForm);
  const [selectedLinkPresetIds, setSelectedLinkPresetIds] = useState<string[]>([]);
  const [draggingLinkId, setDraggingLinkId] = useState<number | null>(null);
  const [dragOverLinkId, setDragOverLinkId] = useState<number | null>(null);
  const [reorderingLinks, setReorderingLinks] = useState(false);

  const [socialLinks, setSocialLinks] = useState<SocialIconLink[]>([]);
  const [socialLinksLoading, setSocialLinksLoading] = useState(false);
  const [socialLinksError, setSocialLinksError] = useState<string | null>(null);
  const [savingSocialLink, setSavingSocialLink] = useState(false);
  const [editingSocialLinkId, setEditingSocialLinkId] = useState<number | null>(null);
  const [socialIconForm, setSocialIconForm] = useState<SocialIconLinkForm>(initialSocialIconForm);
  const [selectedSocialPresetIds, setSelectedSocialPresetIds] = useState<string[]>([]);
  const [socialSectionOpen, setSocialSectionOpen] = useState(false);
  const [linkSectionOpen, setLinkSectionOpen] = useState(true);
  const [showSocialPresets, setShowSocialPresets] = useState(false);
  const [showLinkPresets, setShowLinkPresets] = useState(false);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  const loadProfiles = async () => {
    const res = await fetch("/api/admin/social-profiles", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | SocialProfile[]
      | null;

    if (!res.ok) {
      throw new Error(
        data && "error" in data && typeof data.error === "string"
          ? data.error
          : "Could not load social profiles",
      );
    }

    const rows = Array.isArray(data) ? data : [];
    setProfiles(rows);
    setProfilesError(null);

    if (!rows.length) {
      setSelectedProfileId(null);
      return;
    }

    setSelectedProfileId((prev) => {
      if (prev && rows.some((row) => row.id === prev)) return prev;
      return rows[0].id;
    });
  };

  const loadLinks = async (profileId: number) => {
    const res = await fetch(`/api/admin/social-profiles/${profileId}/links`, {
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | ProfileLink[]
      | null;

    if (!res.ok) {
      throw new Error(
        data && "error" in data && typeof data.error === "string"
          ? data.error
          : "Could not load profile links",
      );
    }

    setLinks(Array.isArray(data) ? data : []);
    setLinksError(null);
  };

  const loadSocialLinks = async (profileId: number) => {
    const res = await fetch(`/api/admin/social-profiles/${profileId}/social-links`, {
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | SocialIconLink[]
      | null;

    if (!res.ok) {
      throw new Error(
        data && "error" in data && typeof data.error === "string"
          ? data.error
          : "Could not load social icon links",
      );
    }

    setSocialLinks(Array.isArray(data) ? data : []);
    setSocialLinksError(null);
  };

  useEffect(() => {
    if (!publicSiteOrigin) {
      setPublicSiteOrigin(resolvePublicOriginFromWindow());
    }
  }, [publicSiteOrigin]);

  useEffect(() => {
    setProfilesLoading(true);
    loadProfiles()
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to load social profiles";
        setProfilesError(message);
        toast.error(message);
      })
      .finally(() => setProfilesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProfile) {
      setSelectedProfileDraft(null);
      setLinks([]);
      setSocialLinks([]);
      setLinksError(null);
      setSocialLinksError(null);
      setSelectedLinkPresetIds([]);
      setSelectedSocialPresetIds([]);
      return;
    }

    setSelectedProfileDraft({
      handle: selectedProfile.handle,
      displayName: selectedProfile.displayName,
      bio: selectedProfile.bio ?? "",
      avatarUrl: selectedProfile.avatarUrl ?? "",
      isActive: selectedProfile.isActive,
    });
    setEditingLinkId(null);
    setLinkForm(initialLinkForm);
    setSelectedLinkPresetIds([]);
    setDraggingLinkId(null);
    setDragOverLinkId(null);
    setEditingSocialLinkId(null);
    setSocialIconForm(initialSocialIconForm);
    setSelectedSocialPresetIds([]);
    setShowSocialPresets(false);
    setShowLinkPresets(false);

    setLinksLoading(true);
    setSocialLinksLoading(true);
    loadLinks(selectedProfile.id)
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to load profile links";
        setLinksError(message);
        toast.error(message);
      })
      .finally(() => setLinksLoading(false));

    loadSocialLinks(selectedProfile.id)
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Failed to load social icon links";
        setSocialLinksError(message);
        toast.error(message);
      })
      .finally(() => setSocialLinksLoading(false));
  }, [selectedProfile]);

  const createProfile = async () => {
    if (!profileForm.handle.trim() || !profileForm.displayName.trim()) {
      toast.error("Handle and display name are required");
      return;
    }

    setCreatingProfile(true);
    try {
      const res = await fetch("/api/admin/social-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: profileForm.handle.trim().toLowerCase(),
          displayName: profileForm.displayName.trim(),
          bio: profileForm.bio.trim() || undefined,
          avatarUrl: profileForm.avatarUrl.trim() || undefined,
          isActive: profileForm.isActive,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | SocialProfile
        | null;

      if (!res.ok) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Could not create social profile",
        );
      }

      toast.success("Profile created");
      setProfileForm(initialProfileForm);
      await loadProfiles();

      if (data && "id" in data && typeof data.id === "number") {
        setSelectedProfileId(data.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create social profile");
    } finally {
      setCreatingProfile(false);
    }
  };

  const saveSelectedProfile = async () => {
    if (!selectedProfile || !selectedProfileDraft) return;

    if (!selectedProfileDraft.handle.trim() || !selectedProfileDraft.displayName.trim()) {
      toast.error("Handle and display name are required");
      return;
    }

    setSavingSelectedProfile(true);
    try {
      const res = await fetch(`/api/admin/social-profiles/${selectedProfile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: selectedProfileDraft.handle.trim().toLowerCase(),
          displayName: selectedProfileDraft.displayName.trim(),
          bio: selectedProfileDraft.bio.trim() || null,
          avatarUrl: selectedProfileDraft.avatarUrl.trim() || null,
          isActive: selectedProfileDraft.isActive,
        }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Could not update profile");
      }

      toast.success("Profile updated");
      await loadProfiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setSavingSelectedProfile(false);
    }
  };

  const persistLinkOrder = async (orderedLinks: ProfileLink[], previousLinks: ProfileLink[]) => {
    if (!selectedProfile) return;

    const changed = orderedLinks
      .map((link, nextOrder) => ({ id: link.id, nextOrder }))
      .filter(({ id, nextOrder }) => {
        const prev = previousLinks.find((item) => item.id === id);
        return !!prev && prev.order !== nextOrder;
      });

    if (changed.length === 0) return;

    setReorderingLinks(true);
    try {
      for (const item of changed) {
        const res = await fetch(
          `/api/admin/social-profiles/${selectedProfile.id}/links/${item.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: item.nextOrder }),
          },
        );
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error || "Could not save reordered links");
        }
      }

      setLinks((prev) =>
        prev.map((link) => {
          const changedLink = changed.find((item) => item.id === link.id);
          return changedLink ? { ...link, order: changedLink.nextOrder } : link;
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reorder links");
      await loadLinks(selectedProfile.id);
    } finally {
      setReorderingLinks(false);
    }
  };

  const reorderLinks = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return;
    const sourceIndex = links.findIndex((item) => item.id === sourceId);
    const targetIndex = links.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const previousLinks = [...links];
    const next = [...links];
    const [moved] = next.splice(sourceIndex, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);
    setLinks(next);
    void persistLinkOrder(next, previousLinks);
  };

  const saveLink = async () => {
    if (!selectedProfile) return;
    if (!linkForm.label.trim() || !linkForm.href.trim()) {
      toast.error("Link label and URL are required");
      return;
    }

    setSavingLink(true);
    try {
      const endpoint =
        editingLinkId === null
          ? `/api/admin/social-profiles/${selectedProfile.id}/links`
          : `/api/admin/social-profiles/${selectedProfile.id}/links/${editingLinkId}`;
      const method = editingLinkId === null ? "POST" : "PATCH";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: linkForm.label.trim(),
          href: linkForm.href.trim(),
          description: linkForm.description.trim() || null,
          order: Number(linkForm.order || 0),
          isActive: linkForm.isActive,
          isFeatured: linkForm.isFeatured,
          openInNewTab: linkForm.openInNewTab,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Could not save profile link");
      }

      toast.success(editingLinkId === null ? "Link added" : "Link updated");
      setEditingLinkId(null);
      setLinkForm(initialLinkForm);
      await loadLinks(selectedProfile.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile link");
    } finally {
      setSavingLink(false);
    }
  };

  const removeLink = async (linkId: number) => {
    if (!selectedProfile) return;
    if (!confirm("Delete this link?")) return;

    try {
      const res = await fetch(
        `/api/admin/social-profiles/${selectedProfile.id}/links/${linkId}`,
        { method: "DELETE" },
      );
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Could not delete profile link");
      }
      toast.success("Link deleted");
      await loadLinks(selectedProfile.id);
      if (editingLinkId === linkId) {
        setEditingLinkId(null);
        setLinkForm(initialLinkForm);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete profile link");
    }
  };

  const saveSocialLink = async () => {
    if (!selectedProfile) return;
    if (!socialIconForm.platform.trim() || !socialIconForm.label.trim() || !socialIconForm.href.trim()) {
      toast.error("Platform, label, and URL are required for social icons");
      return;
    }

    setSavingSocialLink(true);
    try {
      const endpoint =
        editingSocialLinkId === null
          ? `/api/admin/social-profiles/${selectedProfile.id}/social-links`
          : `/api/admin/social-profiles/${selectedProfile.id}/social-links/${editingSocialLinkId}`;
      const method = editingSocialLinkId === null ? "POST" : "PATCH";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: socialIconForm.platform.trim().toLowerCase(),
          label: socialIconForm.label.trim(),
          href: socialIconForm.href.trim(),
          order: Number(socialIconForm.order || 0),
          isActive: socialIconForm.isActive,
          openInNewTab: socialIconForm.openInNewTab,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Could not save social icon");
      }

      toast.success(editingSocialLinkId === null ? "Social icon added" : "Social icon updated");
      setEditingSocialLinkId(null);
      setSocialIconForm(initialSocialIconForm);
      await loadSocialLinks(selectedProfile.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save social icon");
    } finally {
      setSavingSocialLink(false);
    }
  };

  const removeSocialLink = async (socialLinkId: number) => {
    if (!selectedProfile) return;
    if (!confirm("Delete this social icon link?")) return;

    try {
      const res = await fetch(
        `/api/admin/social-profiles/${selectedProfile.id}/social-links/${socialLinkId}`,
        { method: "DELETE" },
      );
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Could not delete social icon link");
      }
      toast.success("Social icon link deleted");
      await loadSocialLinks(selectedProfile.id);
      if (editingSocialLinkId === socialLinkId) {
        setEditingSocialLinkId(null);
        setSocialIconForm(initialSocialIconForm);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete social icon link");
    }
  };

  const toggleLinkPresetSelection = (presetId: string) => {
    setSelectedLinkPresetIds((prev) =>
      prev.includes(presetId) ? prev.filter((id) => id !== presetId) : [...prev, presetId],
    );
  };

  const toggleSocialPresetSelection = (presetId: string) => {
    setSelectedSocialPresetIds((prev) =>
      prev.includes(presetId) ? prev.filter((id) => id !== presetId) : [...prev, presetId],
    );
  };

  const addSelectedLinkPresets = async () => {
    if (!selectedProfile || selectedLinkPresetIds.length === 0) return;
    try {
      const selectedPresets = LINK_PRESETS.filter((preset) =>
        selectedLinkPresetIds.includes(preset.id),
      );
      let added = 0;
      for (const preset of selectedPresets) {
        const payload = preset.build(selectedProfile.handle, links.length + added);
        const alreadyExists = links.some(
          (link) =>
            link.label.toLowerCase() === payload.label.toLowerCase() &&
            link.href.trim().toLowerCase() === payload.href.trim().toLowerCase(),
        );
        if (alreadyExists) continue;

        const res = await fetch(`/api/admin/social-profiles/${selectedProfile.id}/links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: payload.label,
            href: payload.href,
            description: payload.description || null,
            order: Number(payload.order || 0),
            isActive: payload.isActive,
            isFeatured: payload.isFeatured,
            openInNewTab: payload.openInNewTab,
          }),
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error || `Could not add preset: ${preset.label}`);
        }
        added += 1;
      }

      await loadLinks(selectedProfile.id);
      toast.success(added > 0 ? `Added ${added} preset link(s)` : "Selected presets already exist");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add selected presets");
    }
  };

  const removeSelectedLinkPresets = async () => {
    if (!selectedProfile || selectedLinkPresetIds.length === 0) return;
    try {
      const selectedPresets = LINK_PRESETS.filter((preset) =>
        selectedLinkPresetIds.includes(preset.id),
      );
      let removed = 0;
      for (const preset of selectedPresets) {
        const match = preset.build(selectedProfile.handle, 0);
        const matches = links.filter(
          (link) =>
            link.label.toLowerCase() === match.label.toLowerCase() ||
            link.href.trim().toLowerCase() === match.href.trim().toLowerCase(),
        );
        for (const link of matches) {
          const res = await fetch(
            `/api/admin/social-profiles/${selectedProfile.id}/links/${link.id}`,
            { method: "DELETE" },
          );
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          if (!res.ok) {
            throw new Error(data?.error || `Could not remove preset: ${preset.label}`);
          }
          removed += 1;
        }
      }

      await loadLinks(selectedProfile.id);
      toast.success(removed > 0 ? `Removed ${removed} matching link(s)` : "No matching links found");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove selected presets");
    }
  };

  const addSelectedSocialPresets = async () => {
    if (!selectedProfile || selectedSocialPresetIds.length === 0) return;
    try {
      const selectedPresets = SOCIAL_PRESETS.filter((preset) =>
        selectedSocialPresetIds.includes(preset.id),
      );
      let added = 0;
      for (const preset of selectedPresets) {
        const href = preset.buildHref(selectedProfile.handle);
        const alreadyExists = socialLinks.some(
          (link) =>
            link.platform.toLowerCase() === preset.platform.toLowerCase() &&
            link.href.trim().toLowerCase() === href.trim().toLowerCase(),
        );
        if (alreadyExists) continue;

        const res = await fetch(`/api/admin/social-profiles/${selectedProfile.id}/social-links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: preset.platform,
            label: preset.label,
            href,
            order: socialLinks.length + added,
            isActive: true,
            openInNewTab: preset.platform !== "email",
          }),
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error || `Could not add preset: ${preset.label}`);
        }
        added += 1;
      }

      await loadSocialLinks(selectedProfile.id);
      toast.success(
        added > 0 ? `Added ${added} social preset(s)` : "Selected social presets already exist",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add selected social presets");
    }
  };

  const removeSelectedSocialPresets = async () => {
    if (!selectedProfile || selectedSocialPresetIds.length === 0) return;
    try {
      let removed = 0;
      const platforms = SOCIAL_PRESETS.filter((preset) =>
        selectedSocialPresetIds.includes(preset.id),
      ).map((preset) => preset.platform.toLowerCase());

      for (const link of socialLinks) {
        if (!platforms.includes(link.platform.toLowerCase())) continue;
        const res = await fetch(
          `/api/admin/social-profiles/${selectedProfile.id}/social-links/${link.id}`,
          { method: "DELETE" },
        );
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error || "Could not remove selected social presets");
        }
        removed += 1;
      }

      await loadSocialLinks(selectedProfile.id);
      toast.success(
        removed > 0 ? `Removed ${removed} matching social link(s)` : "No matching social links found",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove selected social presets",
      );
    }
  };

  if (profilesLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading Link Tree profiles...
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/18 via-primary/8 to-background p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Link Tree Studio
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Link Tree Profiles
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
          Build and manage profile pages at{" "}
          <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-foreground">
            /profile/{"{handle}"}
          </code>{" "}
          with a Linktree-inspired publishing flow.
        </p>
        {profilesError ? (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {profilesError}
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Create Profile</h2>
              <StatusPill active>Quick Add</StatusPill>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-handle">Handle</Label>
                <Input
                  id="create-handle"
                  value={profileForm.handle}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, handle: e.target.value }))
                  }
                  placeholder="ventura"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-display-name">Display Name</Label>
                <Input
                  id="create-display-name"
                  value={profileForm.displayName}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  placeholder="Ventura"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-bio">Bio (Optional)</Label>
                <Input
                  id="create-bio"
                  value={profileForm.bio}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-avatar">Avatar URL (Optional)</Label>
                <Input
                  id="create-avatar"
                  value={profileForm.avatarUrl}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, avatarUrl: e.target.value }))
                  }
                  placeholder="/brand/logo.svg"
                  className="rounded-xl"
                />
              </div>

              <TogglePill
                label="Active"
                checked={profileForm.isActive}
                onChange={(next) =>
                  setProfileForm((prev) => ({ ...prev, isActive: next }))
                }
              />

              <Button onClick={createProfile} disabled={creatingProfile} className="w-full rounded-xl">
                {creatingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Profile
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Profiles</h2>
            <div className="mt-3 space-y-2">
              {profiles.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                  No profiles yet.
                </p>
              ) : (
                profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2.5 text-left transition",
                      selectedProfileId === profile.id
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-card hover:bg-muted/60",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {profile.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {profile.displayName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">@{profile.handle}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          {selectedProfile && selectedProfileDraft ? (
            <>
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {selectedProfile.displayName}
                    </h2>
                    <p className="text-xs text-muted-foreground">Profile settings</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill active={selectedProfileDraft.isActive}>
                      {selectedProfileDraft.isActive ? "Active" : "Inactive"}
                    </StatusPill>
                    <a
                      href={`${
                        publicSiteOrigin || ""
                      }/profile/${selectedProfile.handle}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                    >
                      Open page
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Handle</Label>
                    <Input
                      value={selectedProfileDraft.handle}
                      onChange={(e) =>
                        setSelectedProfileDraft((prev) =>
                          prev ? { ...prev, handle: e.target.value } : prev,
                        )
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Display Name</Label>
                    <Input
                      value={selectedProfileDraft.displayName}
                      onChange={(e) =>
                        setSelectedProfileDraft((prev) =>
                          prev ? { ...prev, displayName: e.target.value } : prev,
                        )
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Bio</Label>
                    <Input
                      value={selectedProfileDraft.bio}
                      onChange={(e) =>
                        setSelectedProfileDraft((prev) =>
                          prev ? { ...prev, bio: e.target.value } : prev,
                        )
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Avatar URL</Label>
                    <Input
                      value={selectedProfileDraft.avatarUrl}
                      onChange={(e) =>
                        setSelectedProfileDraft((prev) =>
                          prev ? { ...prev, avatarUrl: e.target.value } : prev,
                        )
                      }
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <TogglePill
                    label="Active Profile"
                    checked={selectedProfileDraft.isActive}
                    onChange={(next) =>
                      setSelectedProfileDraft((prev) =>
                        prev ? { ...prev, isActive: next } : prev,
                      )
                    }
                  />
                </div>

                <div className="mt-4">
                  <Button onClick={saveSelectedProfile} disabled={savingSelectedProfile} className="rounded-xl">
                    {savingSelectedProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                    Save Profile
                  </Button>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <SectionToggle
                  title="Social Icons"
                  subtitle="Profile icon links"
                  isOpen={socialSectionOpen}
                  onToggle={() => setSocialSectionOpen((prev) => !prev)}
                  rightContent={<StatusPill active>Per Handle</StatusPill>}
                />

                {socialSectionOpen ? (
                  <>

                    {socialLinksError ? (
                      <p className="mb-3 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {socialLinksError}
                      </p>
                    ) : null}

                <div className="mt-4 mb-4 space-y-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
                    onClick={() => setShowSocialPresets((prev) => !prev)}
                  >
                    {showSocialPresets ? "Hide presets" : "Show presets"}
                  </Button>

                  {showSocialPresets ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                    {SOCIAL_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "rounded-full",
                          selectedSocialPresetIds.includes(preset.id) &&
                            "border-primary/40 bg-primary/10 text-primary",
                        )}
                        onClick={() => toggleSocialPresetSelection(preset.id)}
                      >
                        {preset.label}
                      </Button>
                      ))}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-lg"
                      onClick={addSelectedSocialPresets}
                      disabled={selectedSocialPresetIds.length === 0}
                    >
                      Add Selected
                    </Button>
                      <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={removeSelectedSocialPresets}
                      disabled={selectedSocialPresetIds.length === 0}
                    >
                      Remove Selected
                    </Button>
                      <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-lg"
                      onClick={() => setSelectedSocialPresetIds([])}
                      disabled={selectedSocialPresetIds.length === 0}
                    >
                      Clear
                      </Button>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Platform Key</Label>
                    <Input
                      value={socialIconForm.platform}
                      onChange={(e) =>
                        setSocialIconForm((prev) => ({ ...prev, platform: e.target.value }))
                      }
                      placeholder="instagram, facebook, tiktok, website, email, youtube, x"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Label</Label>
                    <Input
                      value={socialIconForm.label}
                      onChange={(e) =>
                        setSocialIconForm((prev) => ({ ...prev, label: e.target.value }))
                      }
                      placeholder="Instagram"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>URL</Label>
                    <Input
                      value={socialIconForm.href}
                      onChange={(e) =>
                        setSocialIconForm((prev) => ({ ...prev, href: e.target.value }))
                      }
                      placeholder="https://instagram.com/yourhandle or mailto:you@email.com"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5 md:max-w-[180px]">
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      value={socialIconForm.order}
                      onChange={(e) =>
                        setSocialIconForm((prev) => ({ ...prev, order: e.target.value }))
                      }
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <TogglePill
                    label="Active"
                    checked={socialIconForm.isActive}
                    onChange={(next) =>
                      setSocialIconForm((prev) => ({ ...prev, isActive: next }))
                    }
                  />
                  <TogglePill
                    label="Open In New Tab"
                    checked={socialIconForm.openInNewTab}
                    onChange={(next) =>
                      setSocialIconForm((prev) => ({ ...prev, openInNewTab: next }))
                    }
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button onClick={saveSocialLink} disabled={savingSocialLink} className="rounded-xl">
                    {savingSocialLink ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {editingSocialLinkId === null ? "Add Social Icon" : "Update Social Icon"}
                  </Button>
                  {editingSocialLinkId !== null ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditingSocialLinkId(null);
                        setSocialIconForm(initialSocialIconForm);
                      }}
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2">
                  {socialLinksLoading ? (
                    <div className="rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Loading social icons...
                    </div>
                  ) : socialLinks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                      No social icon links yet.
                    </div>
                  ) : (
                    socialLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {link.label} <span className="text-muted-foreground">({link.platform})</span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{link.href}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StatusPill active={link.isActive}>
                            {link.isActive ? "Active" : "Inactive"}
                          </StatusPill>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg px-2"
                            onClick={() => {
                              setEditingSocialLinkId(link.id);
                              setSocialIconForm({
                                platform: link.platform,
                                label: link.label,
                                href: link.href,
                                order: String(link.order ?? 0),
                                isActive: !!link.isActive,
                                openInNewTab: !!link.openInNewTab,
                              });
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-lg px-2"
                            onClick={() => removeSocialLink(link.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                  </>
                ) : null}
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <SectionToggle
                  title="Link Editor"
                  subtitle="Manage primary profile links"
                  isOpen={linkSectionOpen}
                  onToggle={() => setLinkSectionOpen((prev) => !prev)}
                  rightContent={
                    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-primary">
                      <Sparkles className="h-3 w-3" />
                      Linktree style
                    </div>
                  }
                />

                {linkSectionOpen ? (
                  <>
                    {linksError ? (
                      <p className="mb-3 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {linksError}
                      </p>
                    ) : null}

                    <div className="mt-4 mb-4 space-y-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
                        onClick={() => setShowLinkPresets((prev) => !prev)}
                      >
                        {showLinkPresets ? "Hide presets" : "Show presets"}
                      </Button>
                      {showLinkPresets ? (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {LINK_PRESETS.map((preset) => (
                              <Button
                                key={preset.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "rounded-full",
                                  selectedLinkPresetIds.includes(preset.id) &&
                                    "border-primary/40 bg-primary/10 text-primary",
                                )}
                                onClick={() => toggleLinkPresetSelection(preset.id)}
                              >
                                {preset.label}
                              </Button>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-lg"
                              onClick={addSelectedLinkPresets}
                              disabled={selectedLinkPresetIds.length === 0}
                            >
                              Add
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-lg"
                              onClick={removeSelectedLinkPresets}
                              disabled={selectedLinkPresetIds.length === 0}
                            >
                              Remove
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="rounded-lg"
                              onClick={() => setSelectedLinkPresetIds([])}
                              disabled={selectedLinkPresetIds.length === 0}
                            >
                              Clear
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Link Label</Label>
                    <Input
                      value={linkForm.label}
                      onChange={(e) =>
                        setLinkForm((prev) => ({ ...prev, label: e.target.value }))
                      }
                      placeholder="Submit your clip"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Link URL</Label>
                    <Input
                      value={linkForm.href}
                      onChange={(e) =>
                        setLinkForm((prev) => ({ ...prev, href: e.target.value }))
                      }
                      placeholder="/profile/ventura/submit or https://..."
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Description (Optional)</Label>
                    <Input
                      value={linkForm.description}
                      onChange={(e) =>
                        setLinkForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5 md:max-w-[180px]">
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      value={linkForm.order}
                      onChange={(e) =>
                        setLinkForm((prev) => ({ ...prev, order: e.target.value }))
                      }
                      className="rounded-xl"
                    />
                  </div>
                </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                  <TogglePill
                    label="Active"
                    checked={linkForm.isActive}
                    onChange={(next) =>
                      setLinkForm((prev) => ({ ...prev, isActive: next }))
                    }
                  />
                  <TogglePill
                    label="Featured"
                    checked={linkForm.isFeatured}
                    onChange={(next) =>
                      setLinkForm((prev) => ({ ...prev, isFeatured: next }))
                    }
                  />
                  <TogglePill
                    label="Open In New Tab"
                    checked={linkForm.openInNewTab}
                    onChange={(next) =>
                      setLinkForm((prev) => ({ ...prev, openInNewTab: next }))
                    }
                  />
                </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button onClick={saveLink} disabled={savingLink} className="rounded-xl">
                        {savingLink ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {editingLinkId === null ? "Add Link" : "Update Link"}
                      </Button>
                      {editingLinkId !== null ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingLinkId(null);
                            setLinkForm(initialLinkForm);
                          }}
                        >
                          Cancel edit
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </section>

              <section className="space-y-2">
                {reorderingLinks ? (
                  <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                    Saving new link order...
                  </div>
                ) : null}
                {linksLoading ? (
                  <div className="rounded-lg border border-border/70 bg-card p-3 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Loading links...
                  </div>
                ) : links.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    No links yet for this profile.
                  </div>
                ) : (
                  links.map((link) => (
                    <article
                      key={link.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingLinkId(link.id);
                        setDragOverLinkId(link.id);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        if (dragOverLinkId !== link.id) {
                          setDragOverLinkId(link.id);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggingLinkId !== null) {
                          reorderLinks(draggingLinkId, link.id);
                        }
                        setDraggingLinkId(null);
                        setDragOverLinkId(null);
                      }}
                      onDragEnd={() => {
                        setDraggingLinkId(null);
                        setDragOverLinkId(null);
                      }}
                      className={cn(
                        "group rounded-xl border bg-card p-3 transition",
                        draggingLinkId === link.id ? "opacity-70" : "opacity-100",
                        dragOverLinkId === link.id
                          ? "border-primary/50 ring-1 ring-primary/40"
                          : "border-border/70",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          aria-label={`Drag to reorder ${link.label}`}
                          className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground active:cursor-grabbing"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{link.label}</p>
                              <p className="truncate text-xs text-muted-foreground">{link.href}</p>
                              {link.description ? (
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                  {link.description}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span>{link.isActive ? "On" : "Off"}</span>
                              {link.isFeatured ? <span>Featured</span> : null}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Position {link.order} · {link.openInNewTab ? "New tab" : "Same tab"}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-md px-2 opacity-85 group-hover:opacity-100"
                                onClick={() => {
                                  setEditingLinkId(link.id);
                                  setLinkForm({
                                    label: link.label,
                                    href: link.href,
                                    description: link.description ?? "",
                                    order: String(link.order ?? 0),
                                    isActive: !!link.isActive,
                                    isFeatured: !!link.isFeatured,
                                    openInNewTab: !!link.openInNewTab,
                                  });
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-md px-2 opacity-85 group-hover:opacity-100"
                                onClick={() => removeLink(link.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-dashed border-border bg-muted/50 p-10 text-center text-sm text-muted-foreground">
              Create your first profile to start managing Link Tree links.
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
