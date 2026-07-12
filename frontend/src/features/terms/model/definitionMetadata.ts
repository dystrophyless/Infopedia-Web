import type { TFunction } from 'i18next';
import type { Definition } from '../../../types';

export type DefinitionMetadataKey = 'book' | 'topic' | 'page';

export type DefinitionMetadataItem = {
  key: DefinitionMetadataKey;
  label: string;
  value: string;
};

type DefinitionMetadataOptions = {
  showPage?: boolean;
  formatPage?: (page: number) => string;
};

export function getDefinitionBookValue(
  definition: Definition | undefined,
  t: TFunction,
): string | undefined {
  const book = definition?.topic?.book;
  if (!book?.publisher) return undefined;
  if (!book.grade) return book.publisher;
  return t('metadata.bookWithGrade', { publisher: book.publisher, grade: book.grade });
}

export function buildDefinitionMetadataItems(
  definition: Definition | undefined,
  t: TFunction,
  { showPage = true, formatPage = String }: DefinitionMetadataOptions = {},
): DefinitionMetadataItem[] {
  if (!definition) return [];

  const items: Array<DefinitionMetadataItem | null> = [
    {
      key: 'book',
      label: t('metadata.book'),
      value: getDefinitionBookValue(definition, t) ?? '',
    },
    {
      key: 'topic',
      label: t('metadata.topic'),
      value: definition.topic?.name ?? '',
    },
    showPage && definition.page !== undefined && definition.page !== null
      ? {
          key: 'page',
          label: t('metadata.page'),
          value: formatPage(definition.page),
        }
      : null,
  ];

  return items.filter(
    (item): item is DefinitionMetadataItem => item !== null && Boolean(item.value),
  );
}

export function formatDefinitionSource(
  definition: Definition | undefined,
  t: TFunction,
): string | undefined {
  if (!definition) return undefined;

  const bookSource = getDefinitionBookValue(definition, t);
  const pageSource =
    definition.page !== undefined && definition.page !== null
      ? `${t('search.page')} ${definition.page}`
      : undefined;
  const sourceParts = [bookSource, pageSource].filter(Boolean);

  return sourceParts.length > 0 ? sourceParts.join(', ') : undefined;
}

export function normalizeDefinitionPreviewText(text: string): string {
  return text.trim().replace(/\n{2,}/g, '\n');
}

export function getDefinitionIndex(
  definitions: Definition[],
  selectedDefinitionPublicId?: string,
): number {
  if (selectedDefinitionPublicId === undefined) return 0;

  const selectedIndex = definitions.findIndex(
    (definition) => definition.public_id === selectedDefinitionPublicId,
  );

  return selectedIndex >= 0 ? selectedIndex : 0;
}
