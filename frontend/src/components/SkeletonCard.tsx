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
    <div data-skeleton-card className="flex min-h-[208px] w-[684px] animate-pulse flex-col gap-8 rounded-[16px] bg-white p-6" aria-hidden="true">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div data-skeleton-header className="flex min-h-6 items-start justify-between gap-12">
          <div data-skeleton-title className="h-6 w-1/3 rounded bg-bg" />
          <div data-skeleton-header-actions className="flex shrink-0 items-center gap-4">
            <div className="size-6 rounded bg-bg" />
            <div className="size-6 rounded bg-bg" />
          </div>
        </div>
        <div data-skeleton-definition className="space-y-2">
          <div className="h-4 w-full max-w-[480px] rounded bg-bg" />
          <div className="h-4 w-5/6 max-w-[420px] rounded bg-bg" />
        </div>
      </div>
      <div data-skeleton-cta className="h-10 w-[216px] rounded-[8px] bg-bg" />
    </div>
  );
}
