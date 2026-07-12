import { useId, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { Button, Heading, Text } from '../atoms';
import { BottomSheet, type BottomSheetProps } from './BottomSheet';

type DemoProps = Pick<
  BottomSheetProps,
  | 'onDismiss'
  | 'dismissOnOverlay'
  | 'swipeToDismiss'
  | 'swipeThreshold'
  | 'topOffset'
  | 'stackLevel'
>;

function BottomSheetDemo({ onDismiss, ...sheetProps }: DemoProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  const dismiss = () => {
    onDismiss();
    setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open filters</Button>
      <BottomSheet
        {...sheetProps}
        open={open}
        onDismiss={dismiss}
        titleId={titleId}
        descriptionId={descriptionId}
      >
        <Heading id={titleId} level={2} size="section">Filters</Heading>
        <Text id={descriptionId} className="mt-2">
          Choose options, then apply the changes.
        </Text>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={dismiss}>Reset</Button>
          <Button onClick={dismiss}>Apply</Button>
        </div>
      </BottomSheet>
    </>
  );
}

const meta = {
  title: 'Molecules/BottomSheet',
  component: BottomSheet,
  args: {
    open: false,
    onDismiss: fn(),
    titleId: 'bottom-sheet-story-title',
    children: null,
    dismissOnOverlay: true,
    swipeToDismiss: false,
    topOffset: '10dvh',
    stackLevel: 0,
  },
  argTypes: {
    children: { control: false },
  },
  globals: {
    viewport: { value: 'mobile390', isRotated: false },
  },
  render: (args) => (
    <BottomSheetDemo
      onDismiss={args.onDismiss}
      dismissOnOverlay={args.dismissOnOverlay}
      swipeToDismiss={args.swipeToDismiss}
      swipeThreshold={args.swipeThreshold}
      topOffset={args.topOffset}
      stackLevel={args.stackLevel}
    />
  ),
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DismissalFocusAndTrap: Story = {
  args: { onDismiss: fn() },
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Open filters' });
    await userEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'Filters' });
    const dialogQueries = within(dialog);
    const reset = dialogQueries.getByRole('button', { name: 'Reset' });
    const apply = dialogQueries.getByRole('button', { name: 'Apply' });

    await waitFor(() => expect(reset).toHaveFocus());
    await userEvent.tab({ shift: true });
    await expect(apply).toHaveFocus();
    await userEvent.tab();
    await expect(reset).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    await expect(args.onDismiss).toHaveBeenCalledOnce();
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument();
  },
};

export const OverlayDismissalDisabled: Story = {
  args: { onDismiss: fn(), dismissOnOverlay: false },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open filters' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filters' });
    const overlay = dialog.parentElement;
    if (!overlay) throw new Error('Bottom sheet overlay was not rendered');

    await userEvent.click(overlay);
    await expect(args.onDismiss).not.toHaveBeenCalled();
    await expect(dialog).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await expect(args.onDismiss).toHaveBeenCalledOnce();
  },
};

export const SwipeDismissal: Story = {
  args: {
    onDismiss: fn(),
    swipeToDismiss: true,
    swipeThreshold: 80,
    topOffset: 64,
  },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open filters' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filters' });
    const handle = dialog.querySelector<HTMLElement>('[data-bottom-sheet-handle]');
    if (!handle) throw new Error('Bottom sheet handle was not rendered');

    fireEvent.pointerDown(handle, { pointerId: 7, button: 0, clientX: 100, clientY: 10 });
    fireEvent.pointerMove(dialog, { pointerId: 7, buttons: 1, clientX: 100, clientY: 120 });
    fireEvent.pointerUp(dialog, { pointerId: 7, button: 0, clientX: 100, clientY: 120 });

    await waitFor(() => expect(args.onDismiss).toHaveBeenCalledOnce());
    await expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument();
  },
};

export const NestedLayer: Story = {
  args: { stackLevel: 1, topOffset: '20dvh' },
};
