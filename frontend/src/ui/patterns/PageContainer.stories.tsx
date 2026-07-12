import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Surface, Text } from '../atoms';
import { PageContainer } from './PageContainer';

const meta = {
  title: 'Patterns/PageContainer',
  component: PageContainer,
  args: {
    as: 'main',
    width: 'content',
    children: (
      <Surface tone="plain" className="p-6">
        <Text>Page content follows the shared width and gutter rhythm.</Text>
      </Surface>
    ),
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PageContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ResponsiveGutters: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('main')).toBeInTheDocument();
  },
};

export const SafeAreaFullWidth: Story = {
  args: { width: 'full', safeArea: true },
};
