import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpen02Icon, File02Icon, Tag01Icon } from '@hugeicons/core-free-icons';
import { useTranslation } from 'react-i18next';
import type { Definition } from '../../../types';
import { buildDefinitionMetadataItems } from '../model';

export type DefinitionMetadataVariant = 'compact' | 'detail';

export interface DefinitionMetadataProps {
  definition?: Definition;
  variant?: DefinitionMetadataVariant;
  showIcons?: boolean;
  showPage?: boolean;
  topicValueClassName?: string;
  className?: string;
}

const metadataIcons = {
  book: BookOpen02Icon,
  topic: Tag01Icon,
  page: File02Icon,
};

/** Domain adapter for definition metadata. It intentionally owns icons and
 * compact/detail overflow semantics while sharing the same chip vocabulary. */
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
  const items = buildDefinitionMetadataItems(definition, t, { showPage });

  if (items.length === 0) return null;

  return (
    <dl className={['mt-5 flex flex-wrap gap-2 border-t border-border/20 pt-4', className].filter(Boolean).join(' ')}>
      {items.map((item) => (
        <div
          key={item.key}
          className="inline-flex min-h-[34px] min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border/25 bg-bg/45 px-3 py-2 text-[13px] leading-[1.35]"
        >
          {shouldShowIcons && (
            <HugeiconsIcon
              icon={metadataIcons[item.key]}
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
              item.key === 'page' ? 'whitespace-nowrap' : variant === 'detail' ? 'break-words' : 'truncate',
              item.key === 'topic' ? topicValueClassName : '',
            ].filter(Boolean).join(' ')}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
