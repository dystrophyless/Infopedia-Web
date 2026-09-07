import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FeaturedTerm } from '../../../types';
import { formatDefinitionSource, normalizeDefinitionPreviewText } from '../model';
import { MeasuredTextPreview } from './MeasuredTextPreview';

export type FeaturedTermCardVariant = 'guest' | 'guestLanding';

export interface FeaturedTermCardProps {
  featuredTerm: FeaturedTerm;
  clone?: boolean;
  variant: FeaturedTermCardVariant;
}

const shellClassByVariant: Record<FeaturedTermCardVariant, string> = {
  guest: 'h-[168px] w-[216px] rounded-[16px] border-0 bg-white p-6 shadow-none',
  guestLanding: 'h-[168px] w-[262px] rounded-[16px] border-0 bg-white p-6 shadow-none',
};

function oneLineTermName(name: string) {
  return name.length <= 20 ? name : `${name.slice(0, 20).trimEnd()}...`;
}

export function FeaturedTermCard({ featuredTerm, clone = false, variant }: FeaturedTermCardProps) {
  const { t } = useTranslation();
  const { term, featured_definition: definition } = featuredTerm;
  const sourceLine = formatDefinitionSource(definition, t);
  const definitionText = normalizeDefinitionPreviewText(definition.text ?? '');
  const cardClassName = `group relative flex min-w-0 flex-none flex-col overflow-hidden ${shellClassByVariant[variant]}`;
  const cardContent = (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <h3 className="min-w-0 truncate text-[16px] font-medium leading-[16px] text-action-selected">
        {oneLineTermName(definition.name)}
      </h3>
      <MeasuredTextPreview
        text={definitionText}
        className="mt-4 h-[56px] min-h-0 min-w-0 flex-none text-[14px] leading-[14px] text-text-body"
        fadeClassName="from-white"
        maxHeight={56}
      />
      {sourceLine && (
        <p className="mt-4 min-w-0 truncate text-[12px] leading-[12px] text-muted">{sourceLine}</p>
      )}
    </div>
  );

  if (clone) {
    return <div aria-hidden="true" className={cardClassName}>{cardContent}</div>;
  }

  return (
    <Link
      to={`/terms/${term.public_id}`}
      state={{ backTo: '/', term, selectedDefinitionPublicId: definition.public_id }}
      className={cardClassName}
    >
      {cardContent}
    </Link>
  );
}
