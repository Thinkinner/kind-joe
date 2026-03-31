export default function AccountSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      {children}
    </div>
  );
}
