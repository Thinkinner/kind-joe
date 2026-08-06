import { desc } from "drizzle-orm";
import { db } from "@/db";
import { venturaBusinessInquiries } from "@/db/schema";

export default async function AdminVenturaBusinessInquiriesPage() {
  const inquiries = await db
    .select()
    .from(venturaBusinessInquiries)
    .orderBy(desc(venturaBusinessInquiries.createdAt));

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Ventura business inquiries
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Leads from the business promo form on /ventura/posts.
        </p>
      </section>

      {inquiries.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          No business inquiries yet.
        </section>
      ) : (
        <section className="space-y-4">
          {inquiries.map((inquiry) => (
            <article
              key={inquiry.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {inquiry.businessName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Submitted{" "}
                    {inquiry.createdAt
                      ? new Date(inquiry.createdAt).toLocaleString()
                      : "just now"}
                  </p>
                </div>
                <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {inquiry.source}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-foreground">Name</dt>
                  <dd className="text-muted-foreground">{inquiry.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Email</dt>
                  <dd className="text-muted-foreground">
                    <a
                      href={`mailto:${inquiry.email}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {inquiry.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Phone</dt>
                  <dd className="text-muted-foreground">
                    <a
                      href={`tel:${inquiry.phone}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {inquiry.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Business</dt>
                  <dd className="text-muted-foreground">
                    {inquiry.businessName}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
