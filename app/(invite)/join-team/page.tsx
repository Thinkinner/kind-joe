import { Suspense } from "react";
import { JoinTeamClient } from "./join-team-client";

export default function JoinTeamPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-16">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-neutral-900">Team invitation</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Complete setup to access the Kind Joe admin workspace.
        </p>
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
            <JoinTeamClient />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
