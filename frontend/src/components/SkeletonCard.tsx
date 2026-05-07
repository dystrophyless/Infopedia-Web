export function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-[15px] p-8 shadow-feature animate-pulse">
      <div className="h-6 w-1/3 bg-bg rounded mb-4" />
      <div className="h-4 w-full bg-bg rounded mb-2" />
      <div className="h-4 w-5/6 bg-bg rounded mb-4" />
      <div className="h-3 w-2/3 bg-bg rounded" />
    </div>
  );
}
