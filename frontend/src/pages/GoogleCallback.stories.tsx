import { expect, within } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { GoogleCallbackLoadingState } from './GoogleCallback';

const meta = {
  title: 'Pages/Auth/Google callback',
  component: GoogleCallbackLoadingState,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: 'fullscreen' },
  args: { label: 'Завершаем вход...', next: '/' },
} satisfies Meta<typeof GoogleCallbackLoadingState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultAppDestination: Story = {
  args: { next: '/' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelectorAll('[role="status"]')).toHaveLength(1);
    const status = canvasElement.querySelector('[role="status"]');
    await expect(status).toHaveAttribute('aria-busy', 'true');
    await expect(status?.querySelector('.sr-only')).toHaveTextContent('Завершаем вход...');
    await expect(canvasElement.querySelector('[data-google-callback-app-skeleton]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-google-callback-sidebar]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-google-callback-app-content]')).not.toBeNull();
    await expect(canvasElement.querySelectorAll('[data-google-callback-app-surface]')).toHaveLength(2);
    await expect(canvasElement.querySelector('[data-google-callback-mobile-nav]')).not.toBeNull();
    await expect(canvas.queryByText('Завершаем вход')).not.toBeInTheDocument();
  },
};

export const OnboardingDestination: Story = {
  args: { next: '/onboarding' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelectorAll('[role="status"]')).toHaveLength(1);
    await expect(canvasElement.querySelector('[data-google-callback-onboarding-skeleton]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-google-callback-logo]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-google-callback-progress]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-google-callback-onboarding-card]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-google-callback-grade-rows]')).not.toBeNull();
    await expect(canvas.queryByText('Завершаем вход')).not.toBeInTheDocument();
  },
};
