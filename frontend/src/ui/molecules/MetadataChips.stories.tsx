import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MetadataChips } from './MetadataChips';

const meta = {
  title: 'Molecules/MetadataChips',
  component: MetadataChips,
  args: {
    items: [
      { id: 'subject', label: 'Subject', value: 'Informatics', tone: 'brand' },
      { id: 'grade', label: 'Grade', value: '10' },
      { id: 'status', value: 'Ready', tone: 'success' },
    ],
  },
  decorators: [(Story) => <div className="w-[360px]"><Story /></div>],
} satisfies Meta<typeof MetadataChips>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Subject: Informatics')).toBeVisible();
    await expect(canvas.getByText('Grade: 10')).toBeVisible();
  },
};

export const Empty: Story = { args: { items: [] } };
