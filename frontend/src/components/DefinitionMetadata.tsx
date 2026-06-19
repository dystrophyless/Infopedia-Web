import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  BookOpen02Icon,
  File02Icon,
  Tag01Icon,
} from '@hugeicons/core-free-icons';
import type { Definition } from '../types';

type DefinitionMetadataVariant = 'compact' | 'detail';

interface DefinitionMetadataProps {
  definition?: Definition;
  variant?: DefinitionMetadataVariant;
  showIcons?: boolean;
  showPage?: boolean;
  topicValueClassName?: string;
  className?: string;
}

export function DefinitionMetadata({
  definition,
  variant = 'compact',
  showIcons,
  showPage = true,
  topicValueClassName = '',
  className = '',
}: DefinitionMetadataProps) {
  const { t } = useTranslation();
  const shouldShowIcons = showIcons ?? variant === 'compact';

  if (!definition) {
    return null;
  }

  const book = definition.topic?.book;
  const bookValue = book?.publisher
    ? book.grade
      ? t('metadata.bookWithGrade', { publisher: book.publisher, grade: book.grade })
      : book.publisher
    : undefined;

  const items = [
    {
      key: 'book',
      icon: BookOpen02Icon,
      label: t('metadata.book'),
      value: bookValue,
    },
    {
      key: 'topic',
      icon: Tag01Icon,
      label: t('metadata.topic'),
      value: definition.topic?.name,
    },
    {
      key: 'page',
      icon: File02Icon,
      label: t('metadata.page'),
      value: showPage && definition.page !== undefined && definition.page !== null
          ? String(definition.page)
          : undefined,
    },
  ].filter((item) => item.value);

  if (items.length === 0) {
    return null;
  }

  const rowClass =
    variant === 'detail'
      ? 'mt-5 flex flex-wrap gap-2 border-t border-border/20 pt-4'
      : 'mt-5 flex flex-wrap gap-2 border-t border-border/20 pt-4';
  const chipClass =
    variant === 'detail'
      ? 'inline-flex min-h-[34px] min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border/25 bg-bg/45 px-3 py-2 text-[13px] leading-[1.35]'
      : 'inline-flex min-h-[34px] min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border/25 bg-bg/45 px-3 py-2 text-[13px] leading-[1.35]';
  const valueClass = variant === 'detail' ? 'break-words' : 'truncate';

  return (
    <dl
      className={[rowClass, className]
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className={chipClass}
        >
          {shouldShowIcons && (
            <HugeiconsIcon
              icon={item.icon}
              size={14}
              strokeWidth={1.7}
              className="shrink-0 text-border"
              aria-hidden="true"
            />
          )}
          <dt className="shrink-0 leading-[1.35] text-muted">{item.label}:</dt>
          <dd
            className={[
              'min-w-0 font-medium leading-[1.35] text-text-body',
              item.key === 'page' ? 'whitespace-nowrap' : valueClass,
              item.key === 'topic' ? topicValueClassName : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
