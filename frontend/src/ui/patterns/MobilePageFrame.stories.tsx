import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button, Surface, Text } from '../atoms';
import { MobileAppBar } from '../molecules';
import { MobilePageFrame } from './MobilePageFrame';

const apply = fn();

const meta = {
  title: 'Patterns/MobilePageFrame',
  component: MobilePageFrame,
  args: {
    scrollMode: 'content',
    appBar: <MobileAppBar title="Filters" tone="surface" bordered />,
    footer: (
      <Surface tone="plain" className="border-t border-border-subtle p-4">
        <Button fullWidth onClick={apply}>Apply filters</Button>
      </Surface>
    ),
    contentClassName: 'p-6',
    children: (
      <div className="space-y-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Surface key={index} tone="plain" className="p-4">
            <Text>Filter section {index + 1}</Text>
          </Surface>
        ))}
      </div>
    ),
  },
  globals: {
    viewport: { value: 'mobile390', isRotated: false },
  },
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="h-[700px] w-[390px]"><Story /></div>],
} satisfies Meta<typeof MobilePageFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FixedFrame: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Apply filters' }));
    await expect(apply).toHaveBeenCalled();
  },
};

export const DocumentScroll: Story = {
  args: { scrollMode: 'document', footer: undefined },
};
