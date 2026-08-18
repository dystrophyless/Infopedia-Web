import '../../../i18n';
import { useEffect, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, userEvent, within } from 'storybook/test';
import i18n from '../../../i18n';
import type { Term } from '../../../types';
import { TermDetailView } from './TermDetailView';

const term: Term = {
  public_id: 'binary-search',
  name: 'Бинарный поиск',
  definitions: [
    { public_id: 'd1', text: 'Алгоритм поиска элемента в отсортированном массиве.', page: 42, topic: { name: 'Алгоритмы поиска', book: { publisher: 'Арман-ПВ', grade: 10 } } },
    { public_id: 'd2', text: 'Екілік іздеу әр қадамда іздеу аралығын екі есе қысқартады.', page: 43, topic: { name: 'Іздеу алгоритмдері', book: { publisher: 'Мектеп', grade: 10 } } },
  ],
};

function RussianLocale({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void i18n.changeLanguage('ru').then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return ready ? children : null;
}

const meta = {
  title: 'Features/Terms/Detail',
  component: TermDetailView,
  decorators: [(Story) => <MemoryRouter><RussianLocale><Story /></RussianLocale></MemoryRouter>],
  args: { term, backTo: '/search', relatedTerms: [{ public_id: 'linear-search', name: 'Линейный поиск' }] },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TermDetailView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile430Multiple: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Термин' })).toBeVisible();
    const nextButtons = canvas.getAllByRole('button', { name: /Далее/i });
    await userEvent.click(nextButtons[0]);
    await expect(canvas.getAllByText(/Екілік іздеу/)[0]).toBeVisible();
  },
};
export const Mobile320: Story = { globals: { viewport: { value: 'mobile320', isRotated: false } } };
export const Mobile360: Story = { globals: { viewport: { value: 'mobile360', isRotated: false } } };
export const Mobile390: Story = { globals: { viewport: { value: 'mobile390', isRotated: false } } };
export const Desktop1440: Story = { globals: { viewport: { value: 'desktop1440', isRotated: false } } };
export const Loading: Story = { args: { term: null, loadState: 'loading' } };
export const Error: Story = { args: { term: null, loadState: 'error' } };
export const EmptyDefinitions: Story = { args: { term: { public_id: 'empty', name: 'Пустой термин', definitions: [] } } };
