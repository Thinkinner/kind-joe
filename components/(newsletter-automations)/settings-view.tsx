"use client";

import React, { useEffect, useState } from "react";
import {
  Save,
  CheckCircle2,
  Database,
  Globe,
  Webhook,
  ShieldCheck,
  Cpu,
  Loader2,
  Cloud,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AppSettings } from "@/lib/(newsletter-automations)/types";
import {
  getSettings,
  saveSettings,
} from "@/lib/(newsletter-automations)/storage-services";
import { cn } from "@/lib/utils";

const DEFAULT_SETTINGS: AppSettings = {
  webhookUrl: "",
  authorId: "",
  ghlApiKey: "",
  ghlLocationId: "",
};

function SectionTitle({
  icon: Icon,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50 text-orange-600">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <h3 className="text-base font-semibold tracking-tight text-neutral-900">
          {children}
        </h3>
      </div>
    </div>
  );
}

const SettingsView: React.FC = () => {
  const [settings, setLocalSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getSettings();
        setLocalSettings({ ...DEFAULT_SETTINGS, ...data });
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleChange = (field: keyof AppSettings, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveSettings(settings);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in duration-300">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 border-l-[3px] border-orange-500 pl-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Newsletter
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            Settings &amp; integrations
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
            Values are stored in your database. Gemini keys live in server env.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Saved
            </span>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 border border-orange-700 bg-orange-600 px-5 font-semibold text-white shadow-sm hover:bg-orange-700"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      <div className="border border-neutral-200/80 bg-neutral-50/40 px-4 py-3.5 text-sm text-neutral-700">
        <div className="flex gap-3">
          <Cpu
            className="mt-0.5 h-4 w-4 shrink-0 text-orange-600"
            aria-hidden
          />
          <div>
            <p className="font-medium text-neutral-900">Server environment</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-600">
              Gemini uses{" "}
              <code className="bg-white px-1.5 py-0.5 font-mono text-[11px] text-neutral-800 ring-1 ring-neutral-200/80">
                GOOGLE_API_KEY
              </code>{" "}
              and optional{" "}
              <code className="bg-white px-1.5 py-0.5 font-mono text-[11px] text-neutral-800 ring-1 ring-neutral-200/80">
                GEMINI_NEWSLETTER_MODEL
              </code>
              . Newsletter images use Cloudinary fields below.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-12">
        <section className="space-y-4">
          <SectionTitle icon={Database}>Author</SectionTitle>
          <p className="text-sm text-neutral-600">
            Better Auth user id for published articles (must exist or will be
            created as a CMS author stub).
          </p>
          <div className="space-y-2">
            <Label htmlFor="authorId" className="text-neutral-700">
              Author ID
            </Label>
            <Input
              id="authorId"
              placeholder="e.g. auth user id"
              value={settings.authorId || ""}
              onChange={(e) => handleChange("authorId", e.target.value)}
              className="max-w-lg rounded-none border-neutral-200 bg-white font-mono text-sm shadow-sm"
            />
          </div>
        </section>

        <div className="h-px w-full bg-neutral-200/90" />

        <section className="space-y-4">
          <SectionTitle icon={Cloud}>Cloudinary</SectionTitle>
          <p className="text-sm text-neutral-600">
            Same credentials as article uploads. Used to re-host RSS images for
            newsletters.
          </p>
          <div className="grid max-w-lg gap-4">
            <div className="space-y-2">
              <Label htmlFor="cname">Cloud name</Label>
              <Input
                id="cname"
                value={settings.cloudinaryCloudName || ""}
                onChange={(e) =>
                  handleChange("cloudinaryCloudName", e.target.value)
                }
                className="rounded-none border-neutral-200 bg-white shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ckey">API key</Label>
              <Input
                id="ckey"
                value={settings.cloudinaryApiKey || ""}
                onChange={(e) =>
                  handleChange("cloudinaryApiKey", e.target.value)
                }
                className="rounded-none border-neutral-200 bg-white shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="csecret">API secret</Label>
              <Input
                id="csecret"
                type="password"
                value={settings.cloudinaryApiSecret || ""}
                onChange={(e) =>
                  handleChange("cloudinaryApiSecret", e.target.value)
                }
                className="rounded-none border-neutral-200 bg-white shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpreset">Upload preset (unsigned)</Label>
              <Input
                id="cpreset"
                value={settings.cloudinaryUploadPreset || ""}
                onChange={(e) =>
                  handleChange("cloudinaryUploadPreset", e.target.value)
                }
                className="rounded-none border-neutral-200 bg-white shadow-sm"
              />
            </div>
          </div>
        </section>

        <div className="h-px w-full bg-neutral-200/90" />

        <section className="space-y-4">
          <SectionTitle icon={Globe}>GoHighLevel</SectionTitle>
          <p className="text-sm text-neutral-600">Optional CRM integration.</p>
          <div className="grid max-w-lg gap-4">
            <div className="space-y-2">
              <Label htmlFor="ghlLoc">Location ID</Label>
              <Input
                id="ghlLoc"
                placeholder="From GHL URL"
                value={settings.ghlLocationId || ""}
                onChange={(e) =>
                  handleChange("ghlLocationId", e.target.value)
                }
                className="rounded-none border-neutral-200 bg-white shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ghlKey">API key</Label>
              <div className="relative max-w-lg">
                <Input
                  id="ghlKey"
                  type="password"
                  placeholder="Access token"
                  value={settings.ghlApiKey || ""}
                  onChange={(e) => handleChange("ghlApiKey", e.target.value)}
                  className="rounded-none border-neutral-200 bg-white pr-10 shadow-sm"
                />
                <ShieldCheck className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>
          </div>
        </section>

        <div className="h-px w-full bg-neutral-200/90" />

        <section className="space-y-4">
          <SectionTitle icon={Webhook}>Publishing webhook</SectionTitle>
          <p className="text-sm text-neutral-600">
            Called when you approve &amp; send from the review step (e.g.
            Zapier).
          </p>
          <div className="space-y-2">
            <Label htmlFor="webhook">Destination URL</Label>
            <Input
              id="webhook"
              placeholder="https://…"
              value={settings.webhookUrl || ""}
              onChange={(e) => handleChange("webhookUrl", e.target.value)}
              className="max-w-lg rounded-none border-neutral-200 bg-white font-mono text-sm shadow-sm"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;
