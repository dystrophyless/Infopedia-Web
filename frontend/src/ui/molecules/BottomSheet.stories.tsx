import { useId, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { Button, Heading, Text } from '../atoms';
import { BottomSheet, type BottomSheetProps } from './BottomSheet';

type DemoProps = Pick<
  BottomSheetProps,
  | 'onDismiss'
  | 'onAfterClose'
  | 'dismissOnOverlay'
  | 'swipeToDismiss'
  | 'swipeThreshold'
  | 'topOffset'
  | 'stackLevel'
>;

function BottomSheetDemo({ onDismiss, onAfterClose, ...sheetProps }: DemoProps) {
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
        onAfterClose={onAfterClose}
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

function ReopenDuringExitDemo({ onDismiss, onAfterClose }: Pick<DemoProps, 'onDismiss' | 'onAfterClose'>) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const dismiss = () => {
    onDismiss();
    setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open sheet</Button>
      <BottomSheet open={open} onDismiss={dismiss} onAfterClose={onAfterClose} titleId={titleId}>
        <Heading id={titleId} level={2} size="section">Reopenable sheet</Heading>
        <Button className="mt-6" onClick={dismiss}>Close sheet</Button>
      </BottomSheet>
    </>
  );
}

function NestedBottomSheetDemo() {
  const [outerOpen, setOuterOpen] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  const outerTitleId = useId();
  const innerTitleId = useId();

  return (
    <>
      <Button onClick={() => setOuterOpen(true)}>Open outer sheet</Button>
      <BottomSheet
        open={outerOpen}
        onDismiss={() => setOuterOpen(false)}
        onAfterClose={() => undefined}
        titleId={outerTitleId}
      >
        <Heading id={outerTitleId} level={2} size="section">Outer sheet</Heading>
        <Button className="mt-6" onClick={() => setInnerOpen(true)}>Open nested sheet</Button>
        <BottomSheet
          open={innerOpen}
          onDismiss={() => setInnerOpen(false)}
          onAfterClose={() => undefined}
          titleId={innerTitleId}
          stackLevel={1}
        >
          <Heading id={innerTitleId} level={2} size="section">Nested sheet</Heading>
          <Button className="mt-6" onClick={() => setInnerOpen(false)}>Close nested sheet</Button>
        </BottomSheet>
      </BottomSheet>
    </>
  );
}

const exitLifecycleEvents: string[] = [];

const meta = {
  title: 'Molecules/BottomSheet',
  component: BottomSheet,
  args: {
    open: false,
    onDismiss: fn(),
    onAfterClose: undefined,
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
      onAfterClose={args.onAfterClose}
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

export const ExitLifecycle: Story = {
  render: (args) => (
    <BottomSheetDemo
      {...args}
      onDismiss={() => exitLifecycleEvents.push('dismiss')}
      onAfterClose={() => exitLifecycleEvents.push('after-close')}
    />
  ),
  play: async ({ canvasElement }) => {
    exitLifecycleEvents.length = 0;
    const trigger = within(canvasElement).getByRole('button', { name: 'Open filters' });
    await userEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'Filters' });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Reset' })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(dialog).toBeInTheDocument();
    expect(trigger).not.toHaveFocus();
    expect(exitLifecycleEvents).toEqual(['dismiss']);

    fireEvent.transitionEnd(dialog, { propertyName: 'transform' });
    await waitFor(() => expect(exitLifecycleEvents).toEqual(['dismiss', 'after-close']));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
  },
};

export const TransformExitCompletion: Story = {
  args: { onDismiss: fn(), onAfterClose: fn() },
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Open filters' });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Filters' });

    await userEvent.keyboard('{Escape}');
    fireEvent.transitionEnd(dialog, { propertyName: 'opacity' });
    await expect(dialog).toBeInTheDocument();
    await expect(args.onAfterClose).not.toHaveBeenCalled();

    fireEvent.transitionEnd(dialog, { propertyName: 'transform' });
    await waitFor(() => expect(args.onAfterClose).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument());
    await new Promise((resolve) => window.setTimeout(resolve, 260));
    await expect(args.onAfterClose).toHaveBeenCalledOnce();
  },
};

export const ReducedMotionExit: Story = {
  args: { onDismiss: fn(), onAfterClose: fn() },
  play: async ({ canvasElement, args }) => {
    const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }),
    });

    try {
      await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open filters' }));
      await screen.findByRole('dialog', { name: 'Filters' });
      await userEvent.keyboard('{Escape}');

      await waitFor(() => expect(args.onAfterClose).toHaveBeenCalledOnce());
      await expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument();
    } finally {
      if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia);
      else Reflect.deleteProperty(window, 'matchMedia');
    }
  },
};

export const ReopenDuringExit: Story = {
  render: (args) => <ReopenDuringExitDemo onDismiss={args.onDismiss} onAfterClose={args.onAfterClose} />,
  args: { onDismiss: fn(), onAfterClose: fn() },
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Open sheet' });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Reopenable sheet' });

    await userEvent.keyboard('{Escape}');
    await userEvent.click(trigger);
    fireEvent.transitionEnd(dialog, { propertyName: 'transform' });

    await expect(args.onDismiss).toHaveBeenCalledOnce();
    await expect(args.onAfterClose).not.toHaveBeenCalled();
    await expect(await screen.findByRole('dialog', { name: 'Reopenable sheet' })).toBeInTheDocument();
  },
};

export const NestedStackFocus: Story = {
  render: () => <NestedBottomSheetDemo />,
  play: async ({ canvasElement }) => {
    const outerTrigger = within(canvasElement).getByRole('button', { name: 'Open outer sheet' });
    await userEvent.click(outerTrigger);
    const outerDialog = await screen.findByRole('dialog', { name: 'Outer sheet' });
    const nestedTrigger = within(outerDialog).getByRole('button', { name: 'Open nested sheet' });
    await userEvent.click(nestedTrigger);
    const nestedDialog = await screen.findByRole('dialog', { name: 'Nested sheet' });

    await userEvent.keyboard('{Escape}');
    fireEvent.transitionEnd(nestedDialog, { propertyName: 'transform' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nested sheet' })).not.toBeInTheDocument());
    await expect(nestedTrigger).toHaveFocus();
    await expect(outerTrigger).not.toHaveFocus();

    await userEvent.keyboard('{Escape}');
    fireEvent.transitionEnd(outerDialog, { propertyName: 'transform' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Outer sheet' })).not.toBeInTheDocument());
    await expect(outerTrigger).toHaveFocus();
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
