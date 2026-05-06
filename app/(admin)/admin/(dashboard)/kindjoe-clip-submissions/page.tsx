import { desc } from "drizzle-orm";
import { db } from "@/db";
import { kindjoeClipSubmissions } from "@/db/schema";

function formatAgeGroup(ageGroup: string): string {
  switch (ageGroup) {
    case "13_to_17":
      return "13 to 17";
    case "18_and_over":
      return "18 and Over";
    case "12_and_under":
      return "12 and Under";
    default:
      return ageGroup;
  }
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export default async function AdminKindJoeClipSubmissionsPage() {
  const submissions = await db
    .select()
    .from(kindjoeClipSubmissions)
    .orderBy(desc(kindjoeClipSubmissions.createdAt));

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          KindJoe clip submissions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review inbound clip entries from the public profile submit form.
        </p>
      </section>

      {submissions.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          No clip submissions yet.
        </section>
      ) : (
        <section className="space-y-4">
          {submissions.map((submission) => (
            <article key={submission.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {submission.firstName} {submission.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Submitted{" "}
                    {submission.createdAt
                      ? new Date(submission.createdAt).toLocaleString()
                      : "just now"}
                  </p>
                </div>
                <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  Age: {formatAgeGroup(submission.ageGroup)}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-foreground">Email</dt>
                  <dd className="text-muted-foreground">{submission.email}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Filmed Location</dt>
                  <dd className="text-muted-foreground">{submission.filmedLocation}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Recorded this clip?</dt>
                  <dd className="text-muted-foreground">
                    {yesNo(submission.recordedBySubmitter)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Wants clip credit?</dt>
                  <dd className="text-muted-foreground">{yesNo(submission.wantsClipCredit)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Marketing Opt-in</dt>
                  <dd className="text-muted-foreground">{yesNo(submission.marketingOptIn)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-foreground">Clip URL</dt>
                  <dd>
                    <a
                      href={submission.clipUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="break-all text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {submission.clipUrl}
                    </a>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-foreground">Clip Description</dt>
                  <dd className="whitespace-pre-wrap text-muted-foreground">
                    {submission.clipDescription || "-"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-foreground">Digital Signature</dt>
                  <dd className="text-muted-foreground">{submission.digitalSignature}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
