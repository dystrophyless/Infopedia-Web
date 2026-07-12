import { Progress } from '../../../ui';
import { clampPercent, type TestsWeakTopic } from '../model';

export interface WeakTopicProgressListProps {
  topics: TestsWeakTopic[];
}

export function WeakTopicProgressList({ topics }: WeakTopicProgressListProps) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      {topics.map((topic) => {
        const percent = clampPercent(topic.percentage);

        return (
          <div
            key={topic.chapter}
            className="grid min-h-3 grid-cols-[minmax(0,1fr)_148px] items-center gap-[10px]"
          >
            <p className="min-w-0 overflow-hidden text-[12px] font-normal leading-[12px] text-[#fbfbfb] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {topic.chapter}
            </p>
            <div className="flex items-center justify-end gap-2">
              <Progress
                value={percent}
                aria-label={`${topic.chapter}: ${percent}%`}
                size="sm"
                className="h-1 w-[112px] bg-[rgba(251,251,251,0.5)] [&>span]:bg-[#fbfbfb]"
              />
              <span className="w-7 text-[12px] font-medium leading-[12px] text-[#fbfbfb]">
                {percent}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
