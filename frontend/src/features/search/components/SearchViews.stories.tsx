import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, within } from 'storybook/test';
import {
  MobileSearchBrowseHeader,
  MobileSearchEmptyState,
  MobileSearchInputSheet,
  MobileSearchResultHeader,
  MobileSearchModePills,
} from '../pages/TermSearchPage';
import {
  SearchFilterOptionsDialog,
  SelectedFilterControl,
} from '../pages/SearchFiltersPage';
import { SEARCH_FILTER_GRADES, type FilterOption } from '../model';
import { SkeletonCard } from '../../../components/SkeletonCard';

const noSelections = { grade: [], book: [], section: [] };
const noLabels = { grade: {}, book: {}, section: {} };

function Canvas({ children }: { children: React.ReactNode }) {
  return <MemoryRouter><div className="min-h-[720px] bg-bg p-6">{children}</div></MemoryRouter>;
}

function FilterFieldDemo({ selected = false }: { selected?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="w-[390px] bg-white p-6">
      <SelectedFilterControl
        filterId="grade"
        label={t('searchFilters.gradeLabel')}
        options={SEARCH_FILTER_GRADES}
        selectedIds={selected ? ['10', '11'] : []}
        onOpen={fn()}
        onRemove={fn()}
        t={t}
      />
    </div>
  );
}

function OptionsDemo({
  options = SEARCH_FILTER_GRADES,
  selectedIds = [],
  loading = false,
  error = null,
}: {
  options?: FilterOption[];
  selectedIds?: string[];
  loading?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <SearchFilterOptionsDialog
      filterId="grade"
      title={t('searchFilters.gradeLabel')}
      options={options}
      selectedIds={selectedIds}
      isLoading={loading}
      error={error}
      onToggleOption={fn()}
      onResetOptions={fn()}
      onClose={fn()}
      t={t}
    />
  );
}

const meta = {
  title: 'Features/Search/Views',
  component: MobileSearchBrowseHeader,
  args: { query: '', onQueryChange: fn(), onSearchInputFocus: fn() },
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <Canvas><Story /></Canvas>],
} satisfies Meta<typeof MobileSearchBrowseHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Browse: Story = {};

export const Loading: Story = {
  render: () => (
    <div className="flex flex-col gap-3" role="status" aria-label="Загрузка результатов">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  ),
};

export const StaticModes: Story = {
  render: () => <MobileSearchModePills />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');

    await expect(radios[0]).toBeChecked();
    await userEvent.click(radios[1]);
    await expect(radios[1]).toBeChecked();
    radios[1].focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(radios[2]).toHaveFocus();
    await expect(radios[2]).toBeChecked();
    await userEvent.keyboard(' ');
    await expect(radios[2]).toBeChecked();
  },
};

export const ResultsAndFilters: Story = {
  render: () => (
    <MobileSearchResultHeader
      query="Алгоритмдерді практикалық есептерде қолдану"
      resultCount={11}
      entOnlyFilterActive={false}
      searchFilterSelections={{ ...noSelections, grade: ['10'], book: ['book-a', 'book-b'] }}
      searchFilterSelectionLabels={{ ...noLabels, grade: { '10': '10 сынып' }, book: { 'book-a': 'Атамұра', 'book-b': 'Мектеп' } }}
      onBack={fn()}
      onQueryChange={fn()}
      onSearchInputFocus={fn()}
      onEntOnlyFilterToggle={fn()}
    />
  ),
};

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const icon = canvasElement.querySelector<HTMLElement>('[data-mobile-search-empty-icon]');
    const iconSvg = icon?.querySelector<SVGSVGElement>('svg');

    await expect(icon).not.toBeNull();
    await expect(iconSvg).not.toBeNull();
    if (!icon || !iconSvg) return;

    const iconRect = icon.getBoundingClientRect();
    const iconSvgRect = iconSvg.getBoundingClientRect();
    await expect(iconRect.width).toBe(64);
    await expect(iconRect.height).toBe(64);
    await expect(iconSvgRect.width).toBe(32);
    await expect(iconSvgRect.height).toBe(32);
    await expect(getComputedStyle(icon).color).toBe('rgb(106, 55, 195)');
  },
  render: () => <MobileSearchEmptyState query="жоқ термин" />,
};

export const Pagination: Story = {
  render: () => (
    <div className="w-full">
      <MobileSearchResultHeader
        query="алгоритм"
        resultCount={11}
        entOnlyFilterActive={false}
        searchFilterSelections={noSelections}
        searchFilterSelectionLabels={noLabels}
        onBack={fn()}
        onQueryChange={fn()}
        onSearchInputFocus={fn()}
        onEntOnlyFilterToggle={fn()}
      />
      <button type="button" className="mt-6 h-12 w-full rounded-[8px] bg-action-primary text-text-inverse">
        Показать ещё 7
      </button>
    </div>
  ),
};

export const LongRuKk: Story = {
  render: () => (
    <MobileSearchResultHeader
      query="Практикалық есептерді шешу үшін іздеу алгоритмдерін іске асыру и сравнительный анализ эффективности"
      resultCount={11}
      entOnlyFilterActive
      searchFilterSelections={{ ...noSelections, section: ['algorithms'] }}
      searchFilterSelectionLabels={{ ...noLabels, section: { algorithms: 'Алгоритмдер және бағдарламалау / Алгоритмы и программирование' } }}
      onBack={fn()}
      onQueryChange={fn()}
      onSearchInputFocus={fn()}
      onEntOnlyFilterToggle={fn()}
    />
  ),
};

export const MobileInputSheet: Story = {
  render: () => <MobileSearchInputSheet query="алгоритм" onQueryChange={fn()} onClose={fn()} />,
};

export const FiltersEmpty: Story = { render: () => <FilterFieldDemo /> };
export const FiltersSelected: Story = { render: () => <FilterFieldDemo selected /> };
export const FilterOptionsSelected: Story = { render: () => <OptionsDemo selectedIds={['10', '11']} /> };
export const FilterOptionsLoading: Story = { render: () => <OptionsDemo options={[]} loading /> };
export const FilterOptionsFallback: Story = { render: () => <OptionsDemo options={[]} error="Каталог временно недоступен" /> };
export const NestedFilterSheet: Story = { render: () => <OptionsDemo selectedIds={['10']} /> };

export const FilterOptionInteraction: Story = {
  render: () => <OptionsDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const option = canvas.getByText(/7/).closest('label');
    if (!option) throw new Error('Grade option was not rendered');
    await userEvent.click(option);
    await expect(within(option).getByRole('checkbox')).toBeInTheDocument();
  },
};
