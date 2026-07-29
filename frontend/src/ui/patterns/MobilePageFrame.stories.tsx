import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button, Surface, Text } from '../atoms';
import { MobilePageFrame } from './MobilePageFrame';

const apply = fn();

const viewportOptions = {
  mobile320: { name: 'Mobile 320', styles: { width: '320px', height: '568px' }, type: 'mobile' },
  mobile360: { name: 'Mobile 360', styles: { width: '360px', height: '800px' }, type: 'mobile' },
  mobile390: { name: 'Mobile 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
  mobile430: { name: 'Mobile 430', styles: { width: '430px', height: '932px' }, type: 'mobile' },
  desktop1024: { name: 'Desktop 1024', styles: { width: '1024px', height: '768px' }, type: 'desktop' },
  desktop1440: { name: 'Desktop 1440', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
} as const;

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
    contentClassName: 'p-6 md:p-0',
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
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  parameters: { layout: 'fullscreen', viewport: { options: viewportOptions } },
} satisfies Meta<typeof MobilePageFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FixedFrame: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Apply filters' }));
    await expect(apply).toHaveBeenCalled();
  },
};

export const DocumentScroll: Story = { args: { scrollMode: 'document', footer: undefined, className: 'min-h-[1400px]' } };
export const ContentScroll: Story = { args: { scrollMode: 'content', contentClassName: 'min-h-[1400px] p-6 md:p-0' } };

async function exercisePinnedTransition(canvasElement: HTMLElement, mode: 'document' | 'content') {
  const frame = canvasElement.querySelector<HTMLElement>('[data-mobile-page-frame]');
  const slot = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-rail]');
  const wrapper = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-wrapper]');
  const heading = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-wrapper] h1');
  const back = within(canvasElement).getByRole('button', { name: 'Go back' });
  const viewport = canvasElement.querySelector<HTMLElement>('[data-mobile-page-scroll-viewport]');

  expect(frame).not.toBeNull();
  expect(slot).not.toBeNull();
  expect(wrapper).not.toBeNull();
  expect(heading).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!frame || !slot || !wrapper || !heading || !viewport) return;

  const frameTop = frame.getBoundingClientRect().top;
  const initialSlotHeight = slot.getBoundingClientRect().height;
  expect(getComputedStyle(wrapper).position).toBe('static');
  expect(getComputedStyle(wrapper).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(getComputedStyle(wrapper).padding).toBe('0px');
  expect(slot.getBoundingClientRect().top - frameTop).toBe(0);
  expect(heading.getBoundingClientRect().top - frameTop).toBe(80);
  expect(heading.getBoundingClientRect().height).toBe(24);
  back.focus();
  expect(document.activeElement).toBe(back);

  const restoreScroll = () => {
    if (mode === 'content') {
      viewport.scrollTop = 0;
      viewport.dispatchEvent(new Event('scroll'));
    } else {
      const scrollingElement = document.scrollingElement ?? document.documentElement;
      scrollingElement.scrollTop = 0;
      scrollingElement.dispatchEvent(new Event('scroll'));
    }
  };

  const previousDocumentStyles = {
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    bodyMinHeight: document.body.style.minHeight,
  };
  if (mode === 'document') {
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.minHeight = '1800px';
  }

  try {
    if (mode === 'content') {
      viewport.scrollTop = Math.max(
        viewport.scrollTop,
        slot.getBoundingClientRect().bottom - viewport.getBoundingClientRect().top + 2,
        viewport.scrollHeight - viewport.clientHeight,
      );
      viewport.dispatchEvent(new Event('scroll'));
    } else {
      const scrollingElement = document.scrollingElement ?? document.documentElement;
      scrollingElement.scrollTop = Math.max(
        scrollingElement.scrollTop,
        scrollingElement.scrollTop + slot.getBoundingClientRect().bottom + 2,
        scrollingElement.scrollHeight - scrollingElement.clientHeight,
      );
      scrollingElement.dispatchEvent(new Event('scroll'));
    }

    await waitFor(() => {
      const rootTop = mode === 'content' ? viewport.getBoundingClientRect().top : 0;
      expect(slot.getBoundingClientRect().bottom).toBeLessThanOrEqual(rootTop);
    });

    await waitFor(() => {
      expect(getComputedStyle(wrapper).position).toBe('fixed');
    });
    expect(getComputedStyle(wrapper).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(wrapper).paddingTop).toBe('80px');
    expect(getComputedStyle(wrapper).paddingLeft).toBe('16px');
    expect(getComputedStyle(wrapper).paddingRight).toBe('16px');
    expect(getComputedStyle(wrapper).paddingBottom).toBe('16px');
    expect(getComputedStyle(wrapper).borderBottomWidth).toBe('1px');
    expect(getComputedStyle(wrapper).borderBottomStyle).toBe('solid');
    expect(getComputedStyle(wrapper).borderBottomColor).toBe('rgb(213, 211, 217)');
    expect(wrapper.getBoundingClientRect().top).toBe(0);
    expect(wrapper.getBoundingClientRect().height).toBe(120);
    expect(heading.getBoundingClientRect().top).toBe(80);
    expect(canvasElement.querySelectorAll('[data-mobile-page-app-bar-wrapper] h1')).toHaveLength(1);
    expect(within(canvasElement).getAllByRole('button', { name: 'Go back' })).toHaveLength(1);
    expect(document.activeElement).toBe(back);
    expect(slot.getBoundingClientRect().height).toBe(initialSlotHeight);

    restoreScroll();
    await waitFor(() => {
      expect(getComputedStyle(wrapper).position).toBe('static');
    });
    expect(getComputedStyle(wrapper).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(wrapper).padding).toBe('0px');
    expect(getComputedStyle(wrapper).borderBottomWidth).toBe('0px');
    expect(document.activeElement).toBe(back);
    expect(slot.getBoundingClientRect().height).toBe(initialSlotHeight);
  } finally {
    restoreScroll();
    document.documentElement.style.overflow = previousDocumentStyles.htmlOverflow;
    document.body.style.overflow = previousDocumentStyles.bodyOverflow;
    document.body.style.minHeight = previousDocumentStyles.bodyMinHeight;
  }
}

DocumentScroll.play = async ({ canvasElement }) => exercisePinnedTransition(canvasElement, 'document');
ContentScroll.play = async ({ canvasElement }) => exercisePinnedTransition(canvasElement, 'content');
export const Mobile320: Story = { globals: { viewport: { value: 'mobile320', isRotated: false } } };
export const Mobile360: Story = { globals: { viewport: { value: 'mobile360', isRotated: false } } };
export const Mobile390: Story = { globals: { viewport: { value: 'mobile390', isRotated: false } } };
export const Mobile430: Story = { globals: { viewport: { value: 'mobile430', isRotated: false } } };

export const DesktopHeader1024: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: {
    scrollMode: 'document',
    footer: undefined,
    appBar: {
      title: 'Search filters',
      tone: 'surface',
      desktopHeader: {
        description: 'Refine results with filters that stay readable and aligned with the content rail.',
        actions: <Button onClick={apply}>Save filter set</Button>,
      },
    },
  },
  play: async ({ canvasElement }) => {
    const container = canvasElement.querySelector<HTMLElement>('[data-desktop-page-container]');
    const desktopHeader = container?.querySelector<HTMLElement>('header');
    const main = container?.querySelector<HTMLElement>('main');
    const mobileRail = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-rail]');

    expect(container).not.toBeNull();
    expect(desktopHeader).not.toBeNull();
    expect(main).not.toBeNull();
    expect(mobileRail).not.toBeNull();
    if (!container || !desktopHeader || !main || !mobileRail) return;

    expect(getComputedStyle(mobileRail).display).toBe('none');
    expect(getComputedStyle(desktopHeader).display).toBe('flex');
    expect(desktopHeader.getBoundingClientRect().left).toBe(main.getBoundingClientRect().left);
    expect(within(canvasElement).getAllByRole('heading', { name: 'Search filters' })).toHaveLength(1);
  },
};

export const DesktopHeader1440: Story = {
  ...DesktopHeader1024,
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
};

export const LongDesktopHeader: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  args: {
    scrollMode: 'document',
    footer: undefined,
    appBar: {
      title: 'A deliberately long page title that can wrap without colliding with page actions',
      tone: 'surface',
      desktopHeader: {
        description:
          'Supporting copy keeps a sensible reading measure while the shared responsive container aligns the heading, actions, and page content.',
        actions: (
          <>
            <Button variant="secondary" onClick={apply}>Secondary action</Button>
            <Button onClick={apply}>Primary action</Button>
          </>
        ),
      },
    },
  },
};

export const CanonicalGeometry: Story = {
  play: async ({ canvasElement }) => {
    const rail = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-rail]');
    const banner = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-wrapper] > header');
    const wrapper = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-wrapper]');
    const main = canvasElement.querySelector<HTMLElement>('main');
    const frame = canvasElement.querySelector<HTMLElement>('[data-mobile-page-frame]');
    const sentinel = canvasElement.querySelector<HTMLElement>('[data-mobile-page-content-sentinel]');
    const glyph = canvasElement.querySelector<HTMLElement>('[data-mobile-app-bar-glyph]');
    const title = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-rail] h1');
    const leadingAction = within(canvasElement).getByRole('button', { name: 'Go back' });

    expect(rail).not.toBeNull();
    expect(banner).not.toBeNull();
    expect(wrapper).not.toBeNull();
    expect(main).not.toBeNull();
    expect(frame).not.toBeNull();
    expect(sentinel).not.toBeNull();
    expect(glyph).not.toBeNull();
    expect(title).not.toBeNull();
    if (!rail || !banner || !wrapper || !main || !frame || !sentinel || !glyph || !title) return;

    const frameTop = frame.getBoundingClientRect().top;
    const bannerRect = banner.getBoundingClientRect();
    const glyphRect = glyph.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    expect(getComputedStyle(rail).paddingTop).toBe('80px');
    expect(getComputedStyle(wrapper).position).toBe('static');
    expect(getComputedStyle(wrapper).backgroundColor).toBe('rgba(0, 0, 0, 0)');
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
