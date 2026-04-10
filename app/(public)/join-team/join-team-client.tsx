"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function JoinTeamClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const nextParam = `/join-team?token=${encodeURIComponent(token)}`;

  const accept = async () => {
    if (!token) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error || "Could not accept invitation.");
      }
      setStatus("done");
      setMessage("You’re on the team. Redirecting to the admin…");
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  if (!token) {
    return (
      <p className="text-sm text-neutral-600">
        Missing invitation token. Open the link from your email.
      </p>
    );
  }

  if (status === "done") {
    return <p className="text-sm text-emerald-700">{message}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Use the same email the invitation was sent to. Sign in (or create an
        account), then accept below.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/login?next=${encodeURIComponent(nextParam)}`}>
            Sign in
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/register?next=${encodeURIComponent(nextParam)}`}>
            Create account
          </Link>
        </Button>
      </div>
      <div>
        <Button
          type="button"
          onClick={() => void accept()}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Accepting…
            </>
          ) : (
            "Accept invitation"
          )}
        </Button>
      </div>
      {status === "error" && (
        <p className="text-sm text-red-700" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
