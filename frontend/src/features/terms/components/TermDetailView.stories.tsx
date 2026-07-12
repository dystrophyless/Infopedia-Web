import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, userEvent, within } from 'storybook/test';
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

const meta = {
  title: 'Features/Terms/Detail',
  component: TermDetailView,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  args: { term, backTo: '/search', relatedTerms: [{ public_id: 'linear-search', name: 'Линейный поиск' }] },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TermDetailView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile430Multiple: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Бинарный поиск' })).toBeVisible();
    const nextButtons = canvas.getAllByRole('button', { name: /Далее/i });
    await userEvent.click(nextButtons[0]);
    await expect(canvas.getAllByText(/Екілік іздеу/)[0]).toBeVisible();
  },
};
export const Desktop1440: Story = { globals: { viewport: { value: 'desktop1440', isRotated: false } } };
export const Loading: Story = { args: { term: null, loadState: 'loading' } };
export const Error: Story = { args: { term: null, loadState: 'error' } };
export const EmptyDefinitions: Story = { args: { term: { public_id: 'empty', name: 'Пустой термин', definitions: [] } } };
