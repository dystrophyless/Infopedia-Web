import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../atoms';
import { Dialog } from './Dialog';

function DialogDemo({ onDismiss }: { onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  const dismiss = () => { setOpen(false); onDismiss(); };
  return <><Button onClick={() => setOpen(true)}>Open dialog</Button><Dialog open={open} onDismiss={dismiss} titleId="dialog-title" descriptionId="dialog-description" className="max-w-md rounded-surface bg-surface p-6"><h2 id="dialog-title">Dialog title</h2><p id="dialog-description" className="mt-2">Dialog description</p><Button className="mt-4" onClick={dismiss}>Close dialog</Button></Dialog></>;
}
const meta = {
  title: 'Molecules/Dialog',
  component: Dialog,
  args: { open: false, onDismiss: fn(), children: null, titleId: 'dialog-title' },
  render: (args) => <DialogDemo onDismiss={args.onDismiss} />,
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FocusAndEscape: Story = { play: async ({ canvasElement, args }) => { const trigger = within(canvasElement).getByRole('button', { name: 'Open dialog' }); await userEvent.click(trigger); const dialog = await screen.findByRole('dialog', { name: 'Dialog title' }); await expect(dialog).toHaveAttribute('aria-modal', 'true'); await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Close dialog' })).toHaveFocus()); await userEvent.keyboard('{Escape}'); await expect(args.onDismiss).toHaveBeenCalledOnce(); await waitFor(() => expect(trigger).toHaveFocus()); } };
