import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button, Surface, Text } from '../atoms';
import { MobilePageFrame } from './MobilePageFrame';

const apply = fn();

const meta = {
  title: 'Patterns/MobilePageFrame',
  component: MobilePageFrame,
  args: {
    scrollMode: 'content',
    appBar: {
      title: 'Filters',
      tone: 'surface',
      bordered: true,
      titleAlign: 'start',
      leading: (
        <button type="button" aria-label="Go back" className="h-11 w-11 p-0">
          <span data-mobile-app-bar-glyph className="block h-6 w-6 leading-6">&lt;</span>
        </button>
      ),
      trailing: <button type="button" aria-label="Close" className="h-11 w-11 p-0">x</button>,
    },
    footer: (
      <Surface tone="plain" className="border-t border-border-subtle p-4">
        <Button fullWidth onClick={apply}>Apply filters</Button>
      </Surface>
    ),
    contentClassName: 'p-6',
    children: (
      <div className="space-y-4" data-mobile-page-content-sentinel>
        {Array.from({ length: 8 }, (_, index) => (
          <Surface key={index} tone="plain" className="p-4">
            <Text>Filter section {index + 1}</Text>
          </Surface>
        ))}
      </div>
    ),
  },
  globals: {
    viewport: { value: 'mobile390', isRotated: false },
  },
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="h-[700px] w-[390px]"><Story /></div>],
} satisfies Meta<typeof MobilePageFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FixedFrame: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Apply filters' }));
    await expect(apply).toHaveBeenCalled();
  },
};

export const DocumentScroll: Story = {
  args: { scrollMode: 'document', footer: undefined },
};

export const CanonicalGeometry: Story = {
  play: async ({ canvasElement }) => {
    const rail = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-rail]');
    const banner = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-rail] > header');
    const main = canvasElement.querySelector<HTMLElement>('main');
    const frame = canvasElement.querySelector<HTMLElement>('[data-mobile-page-frame]');
    const sentinel = canvasElement.querySelector<HTMLElement>('[data-mobile-page-content-sentinel]');
    const glyph = canvasElement.querySelector<HTMLElement>('[data-mobile-app-bar-glyph]');
    const title = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-rail] h1');
    const leadingAction = within(canvasElement).getByRole('button', { name: 'Go back' });

    expect(rail).not.toBeNull();
    expect(banner).not.toBeNull();
    expect(main).not.toBeNull();
    expect(frame).not.toBeNull();
    expect(sentinel).not.toBeNull();
    expect(glyph).not.toBeNull();
    expect(title).not.toBeNull();
    if (!rail || !banner || !main || !frame || !sentinel || !glyph || !title) return;

    const frameTop = frame.getBoundingClientRect().top;
    const bannerRect = banner.getBoundingClientRect();
    const glyphRect = glyph.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    expect(getComputedStyle(rail).paddingTop).toBe('80px');
    expect(bannerRect.top - frameTop).toBe(80);
    expect(bannerRect.height).toBe(24);
    expect(glyphRect.top - frameTop).toBe(80);
    expect(glyphRect.height).toBe(24);
    expect(glyphRect.bottom - frameTop).toBe(104);
    expect(titleRect.top - frameTop + titleRect.height / 2).toBe(92);
    expect(getComputedStyle(main).paddingTop).toBe('32px');
    expect(sentinel.getBoundingClientRect().top - frameTop).toBe(136);
    expect(leadingAction.getBoundingClientRect().height).toBe(44);
  },
};
