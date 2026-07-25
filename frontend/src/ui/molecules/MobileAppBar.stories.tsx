import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowLeft01Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { expect, within } from 'storybook/test';
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

export const StandardGeometry: Story = {
  args: { safeArea: false },
  play: async ({ canvasElement }) => {
    const header = within(canvasElement).getByRole('banner');
    expect(header.getBoundingClientRect().height).toBe(56);
    expect(getComputedStyle(header).height).toBe('56px');
  },
};

export const BackTitleTrailingBordered: Story = {
  args: {
    title: 'Favorites',
    titleAlign: 'start',
    bordered: true,
  },
};

export const StartAlignedSticky: Story = {
  args: {
    title: 'Results',
    titleAlign: 'start',
    sticky: true,
    trailing: undefined,
  },
};

export const StandaloneSafeArea: Story = {
  args: {
    title: 'Safe area',
    safeArea: true,
    sticky: false,
  },
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<HTMLElement>('header');
    if (!header) throw new Error('Expected the mobile app bar header');

    // `box-content` keeps the 56px working row intact; the safe-area inset is
    // added above it instead of shrinking or overflowing the controls.
    if (!header.classList.contains('box-content')) {
      throw new Error('Standalone safe-area app bars must preserve a content-box row');
    }
    expect(getComputedStyle(header).height).toBe('56px');
  },
};

export const CompactLeadingOnly: Story = {
  args: {
    title: 'Favorites',
    titleAlign: 'start',
    size: 'compact',
    compactLayout: 'leading-only',
    safeArea: false,
    leading: (
      <IconButton aria-label="Go back">
        <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} aria-hidden="true" />
      </IconButton>
    ),
    trailing: undefined,
  },
  play: async ({ canvasElement }) => {
    const header = within(canvasElement).getByRole('banner');
    const leadingTarget = header.querySelector<HTMLElement>('[data-mobile-app-bar-action-target="leading"]');
    const glyph = header.querySelector<SVGElement>('svg');
    if (!leadingTarget || !glyph) throw new Error('Expected compact leading action geometry');

    expect(getComputedStyle(header).columnGap).toBe('16px');
    expect(leadingTarget.getBoundingClientRect().width).toBe(44);
    expect(glyph).toHaveAttribute('width', '24');
    expect(header.querySelector('[data-mobile-app-bar-slot="trailing"]')).toBeNull();
  },
};

export const CompactLeadingOnlyWithTrailingFallback: Story = {
  args: {
    title: 'Favorites',
    titleAlign: 'start',
    size: 'compact',
    compactLayout: 'leading-only',
    safeArea: false,
    leading: (
      <IconButton aria-label="Go back">
        <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} aria-hidden="true" />
      </IconButton>
    ),
    trailing: (
      <IconButton aria-label="Open actions">
        <HugeiconsIcon icon={MoreHorizontalIcon} size={24} strokeWidth={1.7} aria-hidden="true" />
      </IconButton>
    ),
  },
  play: async ({ canvasElement }) => {
    const header = within(canvasElement).getByRole('banner');
    expect(within(canvasElement).getByRole('button', { name: 'Open actions' })).toBeVisible();
    expect(header.classList.contains('grid-cols-[24px_minmax(0,1fr)_24px]')).toBe(true);
    expect(getComputedStyle(header).columnGap).toBe('8px');
    expect(header.querySelector('[data-mobile-app-bar-slot="leading"]')).not.toBeNull();
    expect(header.querySelector('[data-mobile-app-bar-slot="trailing"]')).not.toBeNull();
  },
};
