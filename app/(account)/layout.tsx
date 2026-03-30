export default function AccountSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
