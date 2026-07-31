export interface SkeletonCardProps {
  variant?: 'default' | 'mobile-term-card';
}

export function SkeletonCard({ variant = 'default' }: SkeletonCardProps) {
  if (variant === 'mobile-term-card') {
    return (
      <div className="flex animate-pulse flex-col gap-8 rounded-[16px] bg-white px-6 py-8" aria-hidden="true">
        <div className="flex flex-col gap-6 px-2">
          <div className="relative h-5 pr-10">
            <div className="h-5 w-[70%] rounded bg-bg" />
            <div data-skeleton-favorite className="absolute -right-[10px] -top-[10px] size-11 rounded-full bg-bg" />
          </div>
          <div className="h-24 space-y-2 overflow-hidden">
            <div className="h-4 w-full rounded bg-bg" />
            <div className="h-4 w-full rounded bg-bg" />
            <div className="h-4 w-5/6 rounded bg-bg" />
            <div className="h-4 w-2/3 rounded bg-bg" />
          </div>
          <div data-skeleton-metadata className="flex h-6 items-center gap-2 overflow-hidden">
            <div className="h-6 w-24 rounded-[8px] bg-bg" />
            <div className="h-6 w-20 rounded-[8px] bg-bg" />
          </div>
        </div>
        <div data-skeleton-cta className="h-10 w-full rounded-[8px] bg-bg" />
      </div>
    );
  }

  return (
    <div className="animate-pulse rounded-[15px] border border-border bg-surface max-md:rounded-[16px] max-md:border-0 max-md:p-2" aria-hidden="true">
      <div className="rounded-[12px] p-8 max-md:bg-white max-md:p-4">
        <div className="h-6 w-1/3 rounded bg-bg max-md:h-5" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full rounded bg-bg" />
          <div className="h-4 w-5/6 rounded bg-bg" />
          <div className="h-4 w-2/3 rounded bg-bg" />
        </div>
        <div data-skeleton-metadata className="mt-5 flex gap-2 pt-4">
          <div className="h-[34px] w-24 rounded-full bg-bg" />
          <div className="h-[34px] w-20 rounded-full bg-bg" />
        </div>
        <div data-skeleton-actions className="mt-4 flex justify-end gap-2">
          <div data-skeleton-action className="h-8 w-8 rounded-full bg-bg" />
          <div data-skeleton-action className="h-8 w-8 rounded-full bg-bg" />
        </div>
      </div>
    </div>
  );
}
