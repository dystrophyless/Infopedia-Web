import '../../../i18n';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { SearchChoiceModal } from './SearchChoiceModal';

function Demo({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  if (!open) return <button type="button" onClick={() => setOpen(true)}>Open search choice</button>;
  return (
    <MemoryRouter>
      <SearchChoiceModal
        termSearchTo="/search"
        descriptionSearchTo="/semantic-search"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      />
    </MemoryRouter>
  );
}

const meta = {
  title: 'Features/Search/SearchChoiceModal',
  component: SearchChoiceModal,
  args: {
    termSearchTo: '/search',
    descriptionSearchTo: '/semantic-search',
    onClose: fn(),
  },
  render: (args) => <Demo onClose={args.onClose} />,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SearchChoiceModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile390', isRotated: false } },
};

export const FocusAndEscape: Story = {
  args: { onClose: fn() },
  play: async ({ args }) => {
    const dialog = await screen.findByRole('dialog');
    const closeButton = within(dialog).getByRole('button', { name: 'Закрыть окно выбора поиска' });
    await waitFor(() => expect(closeButton).toHaveFocus());
    await userEvent.tab();
    await expect(within(dialog).getByRole('link', { name: /По названию термина/ })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  },
};
