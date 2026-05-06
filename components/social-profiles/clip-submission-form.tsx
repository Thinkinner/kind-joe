"use client";

import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

type AgeGroup = "12_and_under" | "13_to_17" | "18_and_over";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  clipUrl: string;
  filmedLocation: string;
  hasDescription: boolean;
  clipDescription: string;
  recordedBySubmitter: boolean;
  wantsClipCredit: boolean;
  digitalSignature: string;
  acceptsSubmissionTerms: boolean;
  confirmsNoExclusiveAgreement: boolean;
  confirmsClipGuidelines: boolean;
  marketingOptIn: boolean;
};

const initialFormState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  clipUrl: "",
  filmedLocation: "Los Angeles, CA",
  hasDescription: false,
  clipDescription: "",
  recordedBySubmitter: true,
  wantsClipCredit: false,
  digitalSignature: "",
  acceptsSubmissionTerms: false,
  confirmsNoExclusiveAgreement: false,
  confirmsClipGuidelines: false,
  marketingOptIn: false,
};

function InputLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-semibold text-white">
      {children} {required ? <span className="text-rose-300">*</span> : null}
    </label>
  );
}

export function ClipSubmissionForm({
  handle,
  displayName,
}: {
  handle: string;
  displayName: string;
}) {
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const backHref = `/profile/${handle}`;
  const ageGateOpen = ageGroup === null;
  const isBlockedByAge = ageGroup === "12_and_under";

  const canSubmit = useMemo(() => {
    return (
      !!ageGroup &&
      ageGroup !== "12_and_under" &&
      form.firstName.trim().length > 0 &&
      form.lastName.trim().length > 0 &&
      form.email.trim().length > 0 &&
      form.clipUrl.trim().length > 0 &&
      form.filmedLocation.trim().length > 0 &&
      (!form.hasDescription || form.clipDescription.trim().length > 0) &&
      form.digitalSignature.trim().length > 0 &&
      form.acceptsSubmissionTerms &&
      form.confirmsNoExclusiveAgreement &&
      form.confirmsClipGuidelines
    );
  }, [ageGroup, form]);

  const submitClip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !ageGroup) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/kindjoe/clip-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageGroup,
          ...form,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string | Record<string, string[]> }
        | null;

      if (!response.ok) {
        const apiError =
          data && typeof data.error === "string"
            ? data.error
            : "Could not submit your clip. Please check your information and try again.";
        throw new Error(apiError);
      }

      setForm(initialFormState);
      setSuccessMessage(
        "Submitted successfully. Your clip was sent to KindJoe for review.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not submit your clip right now.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_42%),radial-gradient(circle_at_80%_20%,_rgba(168,85,247,0.2),_transparent_35%)]" />

      <section className="relative mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-white/12 bg-white/[0.06] p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to profile
            </Link>
            <p className="inline-flex items-center gap-1 rounded-full border border-violet-300/35 bg-violet-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              Clip Submission
            </p>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Submit Your Clip to {displayName}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
            Your clip will be submitted to KindJoe for review and publishing consideration.
          </p>

          {isBlockedByAge ? (
            <div className="mt-6 rounded-2xl border border-amber-300/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              Submissions are limited to ages 13 and older. If this clip belongs to a minor, please
              have a parent or legal guardian submit it.
            </div>
          ) : null}

          <form onSubmit={submitClip} className="mt-7 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <InputLabel required>First Name</InputLabel>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-violet-300/60"
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <InputLabel required>Last Name</InputLabel>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-violet-300/60"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <InputLabel required>Email</InputLabel>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-violet-300/60"
                placeholder="name@email.com"
              />
            </div>

            <div className="space-y-2">
              <InputLabel required>Upload OR Paste a Link</InputLabel>
              <input
                type="url"
                value={form.clipUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, clipUrl: e.target.value }))}
                className="w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-violet-300/60"
                placeholder="Choose a clip (Dropbox, Drive, WeTransfer, YouTube, etc.)"
              />
              <p className="text-xs text-slate-400">
                Please submit unedited clips without text or music.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4">
              <p className="text-sm font-semibold text-amber-100">Clip guidelines:</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-100/90">
                <li>- Submit clips you own or are authorized to share.</li>
                <li>- Unedited source clips are preferred for licensing review.</li>
                <li>- Graphic or sensitive footage may be reviewed for publishing suitability.</li>
                <li>- We may edit or decline any clip based on platform and legal requirements.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <InputLabel required>Where was this filmed?</InputLabel>
              <input
                value={form.filmedLocation}
                onChange={(e) => setForm((prev) => ({ ...prev, filmedLocation: e.target.value }))}
                className="w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-violet-300/60"
                placeholder="Los Angeles, CA"
              />
            </div>

            <div className="space-y-2">
              <InputLabel>Add clip description? (optional)</InputLabel>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    form.hasDescription
                      ? "border-violet-300/70 bg-violet-500/30 text-white"
                      : "border-white/20 bg-white/5 text-slate-300"
                  }`}
                  onClick={() => setForm((prev) => ({ ...prev, hasDescription: true }))}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    !form.hasDescription
                      ? "border-violet-300/70 bg-violet-500/30 text-white"
                      : "border-white/20 bg-white/5 text-slate-300"
                  }`}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      hasDescription: false,
                      clipDescription: "",
                    }))
                  }
                >
                  No
                </button>
              </div>
            </div>

            {form.hasDescription ? (
              <div className="space-y-2">
                <InputLabel>Tell us about your clip</InputLabel>
                <textarea
                  value={form.clipDescription}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, clipDescription: e.target.value }))
                  }
                  className="min-h-[120px] w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-violet-300/60"
                  placeholder="A detailed description gives your clip a better chance of being featured."
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <InputLabel required>Did you record this clip?</InputLabel>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    form.recordedBySubmitter
                      ? "border-violet-300/70 bg-violet-500/30 text-white"
                      : "border-white/20 bg-white/5 text-slate-300"
                  }`}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, recordedBySubmitter: true }))
                  }
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    !form.recordedBySubmitter
                      ? "border-violet-300/70 bg-violet-500/30 text-white"
                      : "border-white/20 bg-white/5 text-slate-300"
                  }`}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, recordedBySubmitter: false }))
                  }
                >
                  No
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <InputLabel>Want clip credit? (optional)</InputLabel>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    form.wantsClipCredit
                      ? "border-violet-300/70 bg-violet-500/30 text-white"
                      : "border-white/20 bg-white/5 text-slate-300"
                  }`}
                  onClick={() => setForm((prev) => ({ ...prev, wantsClipCredit: true }))}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    !form.wantsClipCredit
                      ? "border-violet-300/70 bg-violet-500/30 text-white"
                      : "border-white/20 bg-white/5 text-slate-300"
                  }`}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      wantsClipCredit: false,
                    }))
                  }
                >
                  No
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <InputLabel required>Digital Signature</InputLabel>
              <input
                value={form.digitalSignature}
                onChange={(e) => setForm((prev) => ({ ...prev, digitalSignature: e.target.value }))}
                className="w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-violet-300/60"
                placeholder="Type your full legal name"
              />
            </div>

            <div className="space-y-3 rounded-2xl border border-white/12 bg-black/20 p-4 text-sm text-slate-300">
              <p>
                By signing, I agree that all information in this form is true and accurate. I
                understand I am granting an exclusive license to the content submitted, and that
                KindJoe may represent this content on my behalf.
              </p>
              <p>
                I also understand that there is no guarantee of revenue unless my content is
                commercially licensed to an unaffiliated third party. I have reviewed and agree to
                the Contest Rules, Content Submission Agreement, Terms of Service, and Privacy
                Policy.
              </p>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={form.acceptsSubmissionTerms}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      acceptsSubmissionTerms: e.target.checked,
                    }))
                  }
                  className="mt-0.5"
                />
                <span>I agree that all information in this form is true and accurate.</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={form.confirmsNoExclusiveAgreement}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      confirmsNoExclusiveAgreement: e.target.checked,
                    }))
                  }
                  className="mt-0.5"
                />
                <span>I have not signed any exclusive agreements for this clip with anyone else.</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={form.confirmsClipGuidelines}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      confirmsClipGuidelines: e.target.checked,
                    }))
                  }
                  className="mt-0.5"
                />
                <span>
                  My clip meets the Clip Guidelines and may be reviewed for public posting and
                  licensing decisions.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={form.marketingOptIn}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, marketingOptIn: e.target.checked }))
                  }
                  className="mt-0.5"
                />
                <span>Keep me in the know about all things KindJoe.</span>
              </label>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {errorMessage}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200/40 bg-gradient-to-r from-sky-500/40 to-violet-500/40 px-4 py-3 text-sm font-semibold text-white transition enabled:hover:from-sky-500/55 enabled:hover:to-violet-500/55 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Your Clip
            </button>
          </form>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <Link href="/terms" className="hover:text-slate-200">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-200">
              Privacy
            </Link>
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-slate-200"
            >
              Instagram
            </a>
          </div>
        </div>
      </section>

      {ageGateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 text-slate-900 shadow-2xl">
            <p className="text-xl font-semibold">How old are you?</p>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                className="w-full rounded-lg px-4 py-3 text-left font-semibold hover:bg-slate-100"
                onClick={() => setAgeGroup("12_and_under")}
              >
                12 and Under
              </button>
              <button
                type="button"
                className="w-full rounded-lg px-4 py-3 text-left font-semibold hover:bg-slate-100"
                onClick={() => setAgeGroup("13_to_17")}
              >
                13 to 17
              </button>
              <button
                type="button"
                className="w-full rounded-lg px-4 py-3 text-left font-semibold hover:bg-slate-100"
                onClick={() => setAgeGroup("18_and_over")}
              >
                18 and Over
              </button>
            </div>
            <Link
              href={backHref}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200"
            >
              Cancel
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
