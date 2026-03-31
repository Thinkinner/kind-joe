import { connection } from "next/server";
import { requireReaderSession } from "@/lib/auth/server";

export default async function ReaderAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await connection();
  } catch {
    /* older Next without connection() */
  }
  await requireReaderSession();
  return (
    <div className="min-h-dvh px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
