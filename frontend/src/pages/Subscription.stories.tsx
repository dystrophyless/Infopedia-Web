import '../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect } from 'storybook/test';
import { Subscription } from './Subscription';

const meta = {
  title: 'Pages/Subscription',
  component: Subscription,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'mobile430', isRotated: false } },
} satisfies Meta<typeof Subscription>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile430Geometry: Story = {
  play: async ({ canvasElement }) => {
    const main = canvasElement.querySelector('main');
    const card = canvasElement.querySelector('[data-figma-node="425:3479"]');
    const actions = canvasElement.querySelector('[data-subscription-actions]');
    const cta = canvasElement.querySelector('[data-subscription-cta]');
    const disclosure = canvasElement.querySelector('[data-subscription-disclosure]');
    const benefitRows = [...canvasElement.querySelectorAll('li')];

    expect(main).not.toBeNull();
    expect(card).not.toBeNull();
    expect(actions).not.toBeNull();
    expect(cta).not.toBeNull();
    expect(disclosure).not.toBeNull();
    expect(benefitRows).toHaveLength(3);
    if (!main || !card || !actions || !cta || !disclosure) return;

    const cardRect = card.getBoundingClientRect();
    const ctaRect = cta.getBoundingClientRect();
    const disclosureRect = disclosure.getBoundingClientRect();
    expect(Math.round(ctaRect.top - cardRect.bottom)).toBe(24);
    expect(Math.round(disclosureRect.top - ctaRect.bottom)).toBe(16);

    expect(main.contains(card)).toBe(true);
    expect(main.contains(actions)).toBe(true);
    expect(canvasElement.querySelector('footer')).toBeNull();
    expect(getComputedStyle(main).overflowY).toBe('auto');
    expect(getComputedStyle(actions).paddingBottom).toBe('16px');
    for (const row of benefitRows) {
      expect(getComputedStyle(row).alignItems).toBe('center');
      expect(getComputedStyle(row).textAlign).toBe('left');
    }
  },
};
