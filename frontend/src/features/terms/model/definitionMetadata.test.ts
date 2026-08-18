import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import type { Definition } from '../../../types';
import {
  buildDefinitionMetadataItems,
  formatDefinitionSource,
  getDefinitionBookValue,
  getDefinitionIndex,
  normalizeDefinitionPreviewText,
} from './definitionMetadata';

const t = ((key: string, options?: Record<string, unknown>) => {
  if (key === 'metadata.bookWithGrade') {
    return `${String(options?.publisher)}, ${String(options?.grade)} класс`;
  }

  const labels: Record<string, string> = {
    'metadata.book': 'Книга',
    'metadata.topic': 'Тема',
    'metadata.page': 'Страница',
    'search.page': 'стр.',
  };
  return labels[key] ?? key;
}) as unknown as TFunction;

const definition = (overrides: Partial<Definition> = {}): Definition => ({
  public_id: 'definition-1',
  text: 'Definition',
  page: 42,
  topic: {
    name: 'Алгоритмы',
    book: {
      public_id: 'book-1',
      publisher: 'Арман-ПВ',
      grade: 10,
    },
  },
  ...overrides,
});

describe('term definition model characterization', () => {
  it('formats book metadata with grade and omits absent values', () => {
    expect(getDefinitionBookValue(definition(), t)).toBe('Арман-ПВ, 10 класс');
    expect(
      getDefinitionBookValue(
        definition({ topic: { book: { publisher: 'Мектеп' } } }),
        t,
      ),
    ).toBe('Мектеп');
    expect(getDefinitionBookValue(definition({ topic: undefined }), t)).toBeUndefined();
  });

  it('builds ordered metadata rows and preserves caller-specific page formatting', () => {
    expect(
      buildDefinitionMetadataItems(definition(), t, {
        formatPage: (page) => `стр. ${page}`,
      }),
    ).toEqual([
      { key: 'book', label: 'Книга', value: 'Арман-ПВ, 10 класс' },
      { key: 'topic', label: 'Тема', value: 'Алгоритмы' },
      { key: 'page', label: 'Страница', value: 'стр. 42' },
    ]);
    expect(buildDefinitionMetadataItems(definition(), t, { showPage: false })).toHaveLength(2);
    expect(buildDefinitionMetadataItems(undefined, t)).toEqual([]);
  });

  it('formats carousel source copy, preview whitespace, and deep-link definition index', () => {
    expect(formatDefinitionSource(definition(), t)).toBe('Арман-ПВ, 10 класс, стр. 42');
    expect(normalizeDefinitionPreviewText('  first\n\n\nsecond  ')).toBe('first\nsecond');

    const definitions = [
      definition({ public_id: 'first' }),
      definition({ public_id: 'selected' }),
    ];
    expect(getDefinitionIndex(definitions, 'selected')).toBe(1);
    expect(getDefinitionIndex(definitions, 'missing')).toBe(0);
    expect(getDefinitionIndex(definitions)).toBe(0);
  });
});
