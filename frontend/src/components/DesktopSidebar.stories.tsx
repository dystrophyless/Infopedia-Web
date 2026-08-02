import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, within } from 'storybook/test';
import { DesktopSidebar } from './DesktopSidebar';

const meta = {
  title: 'Components/DesktopSidebar',
  component: DesktopSidebar,
  args: {
    activeItem: 'home',
    user: {
      id: 1,
      username: 'dystrophyless',
      email: 'dystrophyless@example.com',
      language: 'ru',
      grade: '11',
      role: 'user',
    },
  },
  decorators: [(Story) => <MemoryRouter initialEntries={['/']}><Story /></MemoryRouter>],
  // The source contract fixes the plan copy at #b1acb9; it is intentionally
  // below axe's contrast threshold and is reviewed against the Figma source.
  parameters: {
    layout: 'fullscreen',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
} satisfies Meta<typeof DesktopSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Home: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: 'Главная' })).toHaveAttribute('aria-current', 'page');
    await expect(canvas.getByRole('button', { name: 'Algosha AI' })).toBeDisabled();
  },
};
export const Tests: Story = { args: { activeItem: 'tests' } };
export const Search: Story = { args: { activeItem: 'search' } };
export const Analyze: Story = { args: { activeItem: 'analyze' } };
export const AlgoshaAiUnavailable: Story = { args: { activeItem: 'algosha' } };
export const ProfileFlow: Story = { args: { activeItem: null, user: { ...meta.args.user, username: 'a-very-long-student-name-that-should-truncate' } } };

export const ScrollableLayoutFlow: Story = {
  render: (args) => (
    <div className="flex min-h-[1400px] items-start bg-[#efebf6]">
      <DesktopSidebar {...args} />
      <main className="min-h-[1400px] flex-1 p-16" aria-label="Scrollable content">
        <div className="h-[1200px] rounded-[16px] bg-white" />
      </main>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const sidebar = canvasElement.querySelector<HTMLElement>('[data-desktop-sidebar]');
    expect(sidebar).not.toBeNull();
    if (!sidebar) return;

    expect(getComputedStyle(sidebar).position).toBe('sticky');
    expect(sidebar.getBoundingClientRect().width).toBeCloseTo(320, 0);
    await expect(sidebar).toHaveClass('top-0', 'self-start');
  },
};
