import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
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
  filterId = 'grade',
  title,
  options = SEARCH_FILTER_GRADES,
  selectedIds = [],
  loading = false,
  error = null,
}: {
  filterId?: 'grade' | 'book' | 'section';
  title?: string;
  options?: FilterOption[];
  selectedIds?: string[];
  loading?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <SearchFilterOptionsDialog
      filterId={filterId}
      title={title ?? t(filterId === 'book' ? 'searchFilters.bookLabel' : filterId === 'section' ? 'searchFilters.sectionLabel' : 'searchFilters.gradeLabel')}
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

const EDITION_OPTIONS: FilterOption[] = [
  { id: 'atamura', label: 'Атамұра' },
  { id: 'almatykitap', label: 'Алматыкітап' },
  { id: 'armanPv', label: 'Арман-ПВ' },
];

const LONG_SECTION_OPTIONS: FilterOption[] = Array.from({ length: 12 }, (_, index) => ({
  id: `section-${index + 1}`,
  label: `Алгоритмдер және бағдарламалау: ұзын раздел ${index + 1}`,
}));

function expectNear(actual: number, expected: number, label: string, tolerance = 1) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}±${tolerance}px, received ${actual}px`);
  }
}

function makeEditionGeometryPlay(expectedWidth: number) {
  return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const dialog = canvasElement.querySelector<HTMLElement>('[data-search-filter-dialog]');
    const header = canvasElement.querySelector<HTMLElement>('[data-search-filter-options-header]');
    const list = canvasElement.querySelector<HTMLElement>('[data-search-filter-options-list]');
    const rows = [...canvasElement.querySelectorAll<HTMLElement>('[data-search-filter-option]')];
    const actions = canvasElement.querySelector<HTMLElement>('[data-search-filter-actions]');
    const title = canvasElement.querySelector<HTMLElement>('#search-filter-dialog-title');

    await expect(window.innerWidth).toBe(expectedWidth);
    await expect(dialog).not.toBeNull();
    await expect(header).not.toBeNull();
    await expect(list).not.toBeNull();
    await expect(rows).toHaveLength(3);
    await expect(actions).not.toBeNull();
    await expect(title).not.toBeNull();
    if (!dialog || !header || !list || rows.length !== 3 || !actions || !title) return;

    const labels = rows.map((row) => row.querySelector('span')?.textContent?.trim());
    await expect(labels).toEqual(['Атамұра', 'Алматыкітап', 'Арман-ПВ']);

    const dialogRect = dialog.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const rowRects = rows.map((row) => row.getBoundingClientRect());
    const actionButtons = [...actions.querySelectorAll<HTMLButtonElement>('button')];
    const actionRect = actions.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    expectNear(dialogRect.left, 0, 'sheet left');
    expectNear(dialogRect.right, viewportWidth, 'sheet right');
    expectNear(dialogRect.width, viewportWidth, 'sheet width');
    rowRects.forEach((rect, index) => {
      expectNear(rect.left, 24, `row ${index + 1} left`);
      expectNear(rect.right, viewportWidth - 24, `row ${index + 1} right`);
      expectNear(rect.height, 48, `row ${index + 1} height`);
      if (index > 0) expectNear(rect.top - rowRects[index - 1].bottom, 8, `row ${index} gap`);
    });
    expectNear(rowRects[0].top - titleRect.bottom, 32, 'title-to-first-row gap');

    const firstText = rows[0].querySelector<HTMLElement>('span');
    const firstCheckbox = rows[0].querySelector<HTMLElement>('.search-filter-checkbox-visual');
    await expect(firstText).not.toBeNull();
    await expect(firstCheckbox).not.toBeNull();
    if (!firstText || !firstCheckbox) return;
    await expect(getComputedStyle(title).fontSize).toBe('20px');
    await expect(getComputedStyle(title).lineHeight).toBe('20px');
    await expect(getComputedStyle(firstText).fontSize).toBe('16px');
    await expect(getComputedStyle(firstText).lineHeight).toBe('16px');
    expectNear(firstCheckbox.getBoundingClientRect().width, 24, 'checkbox width');
    expectNear(firstCheckbox.getBoundingClientRect().height, 24, 'checkbox height');

    expectNear(actionRect.left, 0, 'footer left');
    expectNear(actionRect.right, viewportWidth, 'footer right');
    expectNear(actionRect.bottom, dialogRect.bottom, 'footer aligns with sheet bottom');
    await expect(dialogRect.top).toBeLessThan(window.innerHeight + 1);
    await expect(actionButtons).toHaveLength(2);
    if (actionButtons.length === 2) {
      const buttonRects = actionButtons.map((button) => button.getBoundingClientRect());
      buttonRects.forEach((rect, index) => {
        expectNear(rect.height, 48, `footer button ${index + 1} height`);
        expectNear(rect.left, index === 0 ? 24 : viewportWidth / 2 + 6, `footer button ${index + 1} left`);
      });
      expectNear(buttonRects[0].right, viewportWidth / 2 - 6, 'reset button right');
      expectNear(buttonRects[1].right, viewportWidth - 24, 'save button right');
    }
    await expect(header.dataset.scrolled).toBe('false');
    await expect(getComputedStyle(header).borderBottomColor).toBe('rgba(0, 0, 0, 0)');
  };
}

const editionGeometryRender = () => <OptionsDemo filterId="book" title="Издание" options={EDITION_OPTIONS} />;

export const EditionOptionsGeometry: Story = {
  render: editionGeometryRender,
  play: makeEditionGeometryPlay(390),
};

export const EditionOptionsGeometry320: Story = {
  render: editionGeometryRender,
  play: makeEditionGeometryPlay(320),
  globals: { viewport: { value: 'mobile320', isRotated: false } },
};

export const EditionOptionsGeometry360: Story = {
  render: editionGeometryRender,
  play: makeEditionGeometryPlay(360),
  globals: { viewport: { value: 'mobile360', isRotated: false } },
};

export const EditionOptionsGeometry390: Story = {
  render: editionGeometryRender,
  play: makeEditionGeometryPlay(390),
  globals: { viewport: { value: 'mobile390', isRotated: false } },
};

export const EditionOptionsGeometry430: Story = {
  render: editionGeometryRender,
  play: makeEditionGeometryPlay(430),
  globals: { viewport: { value: 'mobile430', isRotated: false } },
};

export const LongSectionOptionsGeometry: Story = {
  render: () => <OptionsDemo filterId="section" options={LONG_SECTION_OPTIONS} />,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<HTMLElement>('[data-search-filter-options-list]');
    const dialog = canvasElement.querySelector<HTMLElement>('[data-search-filter-dialog]');
    const header = canvasElement.querySelector<HTMLElement>('[data-search-filter-options-header]');
    const actions = canvasElement.querySelector<HTMLElement>('[data-search-filter-actions]');
    const longRow = canvasElement.querySelector<HTMLElement>('[data-search-filter-option="section-1"]');
    await expect(list).not.toBeNull();
    await expect(dialog).not.toBeNull();
    await expect(header).not.toBeNull();
    await expect(actions).not.toBeNull();
    await expect(longRow).not.toBeNull();
    if (!list || !dialog || !header || !actions || !longRow) return;

    await new Promise((resolve) => setTimeout(resolve, 250));
    await expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
    window.scrollTo(0, 0);
    await expect(longRow.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
    await expect(header.dataset.scrolled).toBe('false');
    await expect(getComputedStyle(header).borderBottomColor).toBe('rgba(0, 0, 0, 0)');
    const headerBefore = header.getBoundingClientRect();
    const footerBefore = actions.getBoundingClientRect();

    list.scrollTop = Math.max(1, list.scrollHeight - list.clientHeight);
    list.dispatchEvent(new Event('scroll', { bubbles: true }));
    window.scrollTo(0, 0);
    await waitFor(() => {
      expect(canvasElement.querySelector('[data-search-filter-options-header]')?.getAttribute('data-scrolled')).toBe('true');
      expect(getComputedStyle(header).borderBottomColor).toBe('rgb(213, 211, 217)');
    });
    expectNear(header.getBoundingClientRect().top, headerBefore.top, 'header top after scroll');
    expectNear(header.getBoundingClientRect().height, headerBefore.height, 'header height after scroll');
    expectNear(actions.getBoundingClientRect().bottom, footerBefore.bottom, 'footer bottom after scroll');
    expect(actions.getBoundingClientRect().height).toBeGreaterThan(0);
    expectNear(actions.getBoundingClientRect().bottom, dialog.getBoundingClientRect().bottom, 'footer remains inside sheet');

    list.scrollTop = 0;
    list.dispatchEvent(new Event('scroll', { bubbles: true }));
    await waitFor(() => {
      expect(header.dataset.scrolled).toBe('false');
      expect(getComputedStyle(header).borderBottomColor).toBe('rgba(0, 0, 0, 0)');
    });
  },
};

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
