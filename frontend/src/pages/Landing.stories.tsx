import '../../src/i18n';
import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Landing } from './Landing';

function LandingState({ authenticated }: { authenticated: boolean }) {
  useEffect(() => {
    useAuthStore.setState({ isAuthenticated: authenticated });
    return () => {
      useAuthStore.setState({ isAuthenticated: false });
    };
  }, [authenticated]);

  return <Landing />;
}

const meta = {
  title: 'Pages/Landing',
  component: Landing,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Landing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GuestMobile: Story = {
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  render: () => <LandingState authenticated={false} />,
};

export const AuthenticatedMobile: Story = {
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  render: () => <LandingState authenticated />,
};

export const GuestDesktop: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => <LandingState authenticated={false} />,
};

export const AuthenticatedDesktop: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => <LandingState authenticated />,
};
