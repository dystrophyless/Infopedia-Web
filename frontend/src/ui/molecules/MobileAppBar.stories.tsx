import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from '../atoms';
import { MobileAppBar } from './MobileAppBar';

const meta = {
  title: 'Molecules/MobileAppBar',
  component: MobileAppBar,
  args: {
    title: 'Search filters',
    tone: 'surface',
    bordered: true,
    leading: (
      <IconButton aria-label="Go back">
        <span aria-hidden="true">&lt;</span>
      </IconButton>
    ),
    trailing: (
      <IconButton aria-label="Close">
        <span aria-hidden="true">x</span>
      </IconButton>
    ),
  },
  globals: {
    viewport: { value: 'mobile390', isRotated: false },
  },
  decorators: [(Story) => <div className="w-[390px]"><Story /></div>],
} satisfies Meta<typeof MobileAppBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Centered: Story = {};

export const StartAlignedSticky: Story = {
  args: {
    title: 'Results',
    titleAlign: 'start',
    sticky: true,
    trailing: undefined,
  },
};
