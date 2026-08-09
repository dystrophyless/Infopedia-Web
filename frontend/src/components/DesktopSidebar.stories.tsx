import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DesktopSidebar } from './DesktopSidebar';

const meta = {
  title: 'Components/DesktopSidebar',
  component: DesktopSidebar,
  args: {
    activeItem: 'home',
    onLogout: fn(),
    user: {
      id: 1,
      username: 'dystrophyless',
      email: 'dystrophyless@example.com',
      language: 'ru',
      grade: '11',
      role: 'user',
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Story />
      </MemoryRouter>
    ),
  ],
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
export const Tests: Story = {
  args: { activeItem: 'tests' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link', { name: 'Тесты' })).toHaveAttribute('aria-current', 'page');
  },
};
export const Search: Story = {
  args: { activeItem: 'search' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link', { name: 'Поиск' })).toHaveAttribute('aria-current', 'page');
  },
};
export const Analyze: Story = {
  args: { activeItem: 'analyze' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link', { name: 'Анализ ЕНТ' })).toHaveAttribute('aria-current', 'page');
  },
};
export const AlgoshaAi: Story = {
  args: { activeItem: 'algosha' },
  play: async ({ canvasElement }) => {
    const algosha = within(canvasElement).getByRole('button', { name: 'Algosha AI' });
    await expect(algosha).toBeDisabled();
    await expect(algosha).toHaveClass('bg-[#f8f5fc]', 'text-[#865bcf]');
  },
};
export const Profile: Story = {
  args: { activeItem: 'profile' },
  play: async ({ canvasElement }) => {
    const profileButton = within(canvasElement).getByRole('button', { name: /Профиль:/ });
    await expect(profileButton).toHaveAttribute('aria-current', 'page');
    await expect(profileButton).toHaveAttribute('aria-expanded', 'false');
  },
};
export const ProfileDefault: Story = {
  args: { activeItem: null },
  play: async ({ canvasElement }) => {
    const profileButton = within(canvasElement).getByRole('button', { name: /Профиль:/ });
    await expect(profileButton).toHaveAttribute('aria-expanded', 'false');
    await expect(profileButton).not.toHaveAttribute('aria-current');
    await expect(profileButton).toHaveClass('hover:bg-[#f8f5fc]');
  },
};
export const ProfileClicked: Story = {
  args: { activeItem: null },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const profileButton = canvas.getByRole('button', { name: /Профиль:/ });
    args.onLogout.mockClear();
    await userEvent.click(profileButton);
    const favorites = canvas.getByRole('link', { name: 'Избранное' });
    await expect(profileButton).toHaveAttribute('aria-expanded', 'true');
    await expect(profileButton).not.toHaveAttribute('aria-current');
    await expect(profileButton).toHaveClass('bg-[#f8f5fc]');
    await expect(favorites).toHaveFocus();
    await expect(favorites).toHaveAttribute('href', '/favorites');
    await expect(canvas.getByRole('link', { name: 'Слабые темы' })).toHaveAttribute('href', '/profile?tab=weakTopics');
    await expect(canvas.getByRole('link', { name: 'Купить подписку' })).toHaveAttribute('href', '/subscription');
    await expect(canvas.getByRole('link', { name: 'Настройки' })).toHaveAttribute('href', '/profile?tab=settings');
    await expect(canvas.getByRole('button', { name: 'Справка' })).toBeDisabled();

    const popup = canvas.getByLabelText('Меню профиля');
    await expect([...popup.querySelectorAll('a, button')].map((action) => action.textContent?.trim())).toEqual([
      'Избранное',
      'Слабые темы',
      'Купить подписку',
      'Настройки',
      'Справка',
      'Выйти',
    ]);
    await userEvent.keyboard('{Escape}');
    await expect(profileButton).toHaveAttribute('aria-expanded', 'false');
    await expect(profileButton).toHaveFocus();

    await userEvent.click(profileButton);
    await userEvent.click(canvasElement);
    await expect(profileButton).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(profileButton);
    await userEvent.click(canvas.getByRole('button', { name: 'Выйти' }));
    await expect(args.onLogout).toHaveBeenCalledOnce();
    await expect(profileButton).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(profileButton);
    await expect(canvas.getByRole('link', { name: 'Избранное' })).toHaveFocus();
  },
};
export const ProfileMenuClicked: Story = {
  args: { activeItem: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const profileButton = canvas.getByRole('button', { name: /Профиль:/ });
    await userEvent.click(profileButton);
    const settings = canvas.getByRole('link', { name: 'Настройки' });
    await userEvent.hover(settings);
    await expect(getComputedStyle(settings).backgroundColor).toBe('rgb(222, 210, 241)');
    await expect(settings).toHaveClass('rounded-[4px]', 'px-[8px]', 'py-[6px]');
  },
};
