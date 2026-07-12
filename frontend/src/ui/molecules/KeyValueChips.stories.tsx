import type { Meta, StoryObj } from '@storybook/react-vite';
import { KeyValueChips } from './KeyValueChips';

const meta = {
  title: 'Molecules/KeyValueChips',
  component: KeyValueChips,
  args: {
    items: [
      { id: 'grade', label: 'Grade', value: '11', tone: 'brand' },
      { id: 'book', label: 'Book', value: 'Informatics' },
      { id: 'topic', label: 'Topic', value: 'Search algorithms', tone: 'success' },
    ],
  },
} satisfies Meta<typeof KeyValueChips>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Metadata: Story = {};

export const LongValues: Story = {
  args: {
    items: [
      {
        id: 'topic',
        label: 'Topic',
        value: 'Implementation of search algorithms for solving practical problems',
        tone: 'brand',
      },
    ],
    className: 'max-w-[320px]',
  },
};
