/** Lightweight fallback while account routes load — avoids full-page form skeletons. */
export default function AccountLoading() {
  return (
    <div className="mx-auto flex min-h-[45vh] w-full max-w-lg items-center justify-center px-4 py-12">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
