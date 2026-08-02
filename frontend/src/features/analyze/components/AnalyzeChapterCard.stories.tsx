import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import type { AnalyzeChapterResult } from '../../../types';
import { AnalyzeChapterCard } from './AnalyzeChapterCard';

const unlockedChapter: AnalyzeChapterResult = {
  chapter_id: 7,
  code: 'algorithms-and-programming',
  title: 'Algorithms and programming',
  question_count: 12,
  max_score: 20,
  score: 14,
  percentage: 70,
  books: [{ public_id: 'book-1', publisher: 'Arman-PV', grade: 10, topic_count: 3, percentage: 75 }],
  topic_count: 3,
  material_grades: [10, 11],
  topic_codes: [
    { name: 'loops', title: 'Loops', status: 'active' },
    { name: 'arrays', title: 'Arrays', status: 'pending' },
    { name: 'conditions', title: 'Conditional algorithms', status: 'completed' },
  ],
};

const lockedChapter: AnalyzeChapterResult = {
  ...unlockedChapter,
  chapter_id: 8,
  code: 'information-security',
  title: 'Information security',
  topic_count: 5,
  topic_codes: [],
};

const meta = {
  title: 'Features/Analyze/Chapter card',
  component: AnalyzeChapterCard,
  parameters: { layout: 'centered' },
  decorators: [(Story) => <MemoryRouter><div className="w-[382px] bg-[#efebf6] p-4"><Story /></div></MemoryRouter>],
} satisfies Meta<typeof AnalyzeChapterCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnlockedDetail: Story = {
  args: { chapter: unlockedChapter, locked: false, mode: 'detail', practiceTo: '/practice-by-topic?chapterId=7' },
};

export const LockedDetail: Story = {
  args: { chapter: lockedChapter, locked: true, mode: 'detail' },
};

export const SummaryDefault: Story = {
  args: { chapter: unlockedChapter, locked: false, mode: 'summary' },
};

export const SummarySelected: Story = {
  args: { chapter: unlockedChapter, locked: false, mode: 'summary', selected: true, onSelect: () => undefined },
};

export const LongTitleAndTopics: Story = {
  args: {
    chapter: {
      ...unlockedChapter,
      title: 'Information representation, measurement, coding, and digital systems',
      topic_codes: Array.from({ length: 7 }, (_, index) => ({
        name: `topic-${index}`,
        title: `A very long topic label for responsive wrapping ${index + 1}`,
      })),
    },
    locked: false,
    mode: 'detail',
    practiceTo: '/practice-by-topic?chapterId=7',
  },
};
