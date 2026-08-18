import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, IconButton } from '../atoms';
import { PageHeader } from './PageHeader';

const meta = {
  title: 'Patterns/PageHeader',
  component: PageHeader,
  args: {
    eyebrow: 'Practice',
    title: 'Search algorithms',
    description: 'Solve practical tasks and review the reasoning behind each answer.',
    trailing: (
      <IconButton aria-label="More actions">
        <span aria-hidden="true">...</span>
      </IconButton>
    ),
    actions: (
      <>
        <Button>Start practice</Button>
        <Button variant="secondary">Review theory</Button>
      </>
    ),
  },
  decorators: [(Story) => <div className="w-[min(90vw,760px)]"><Story /></div>],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullHeader: Story = {};

export const Centered: Story = {
  args: { align: 'center', trailing: undefined },
};
