import { requireReaderSession } from "@/lib/auth/server";

export default async function ReaderAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireReaderSession();
  return children;
}
