import { ArrowLeft01Icon, ArrowRight01Icon, Flag02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Term } from '../../../types';
import { normalizeDefinitionPreviewText } from '../model';
import { DefinitionMetadata } from './DefinitionMetadata';
import { MeasuredTextPreview } from './MeasuredTextPreview';
import { TermCardFavoriteButton } from './TermCardFavoriteButton';

export interface TermCardProps {
  term: Term;
  relatedTerms?: Pick<Term, 'public_id' | 'name'>[];
  backTo?: string;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  expansion?: 'intrinsic' | 'fill-parent';
}

export function TermCard({ term, relatedTerms = [], backTo = '/search', selected = false, onSelectedChange, expansion = 'intrinsic' }: TermCardProps) {
  const { t } = useTranslation();
  const definition = term.definitions?.[0];
  const inspectTitleIsLong = term.name.length > 48;
  const detailLink = <Link to={`/terms/${term.public_id}`} state={{ backTo, term, relatedTerms }} className="flex h-10 w-[216px] shrink-0 items-center justify-center rounded-[8px] bg-[#6a37c3] px-8 text-[16px] font-medium leading-4 text-[#efeaf8] outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2">{t('terms.inspectDetailsCta')}</Link>;

  return (
    <div className={`group/inspect relative hidden min-w-0 items-start md:flex ${selected ? (expansion === 'fill-parent' ? 'w-full max-[1131px]:flex-wrap' : 'w-[951px]') : 'w-full max-w-[684px] min-[1132px]:hover:w-[716px] min-[1132px]:hover:max-w-[716px] min-[1132px]:focus-within:w-[716px] min-[1132px]:focus-within:max-w-[716px]'}`} data-term-card-state={selected ? 'clicked' : 'default'}>
      <div className="relative flex min-h-[208px] h-auto w-full max-w-[684px] shrink-0 flex-col gap-8 rounded-[16px] bg-white p-6 text-[#161519]" data-term-card-main>
        <div className="flex min-h-0 flex-1 flex-col gap-4" data-term-card-body>
          <div className="flex min-h-6 items-start justify-between gap-12">
            <button type="button" data-term-card-title className="min-w-0 flex-1 rounded-[8px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2" aria-label={term.name} aria-pressed={selected} onClick={() => onSelectedChange?.(!selected)}>
              <span className={`block truncate font-medium ${inspectTitleIsLong ? 'text-[20px] leading-5' : 'text-[22px] leading-6'}`}>{term.name}</span>
            </button>
            <div className="flex shrink-0 items-center gap-4" data-term-card-header-actions>
              <span className="flex size-6 items-center justify-center" aria-hidden="true"><HugeiconsIcon icon={Flag02Icon} size={24} strokeWidth={1.7} /></span>
              <TermCardFavoriteButton termRef={term.public_id} termName={term.name} className="-my-[10px]" />
            </div>
          </div>
          {definition && <MeasuredTextPreview text={normalizeDefinitionPreviewText(definition.text)} className="max-w-[480px] text-[16px] leading-4 text-[#8C8698]" maxHeight={80} />}
        </div>
        <span data-term-card-cta>{detailLink}</span>
      </div>
      {!selected && <div className="hidden self-stretch w-8 shrink-0 box-border py-8 min-[1132px]:group-hover/inspect:flex min-[1132px]:group-focus-within/inspect:flex"><button type="button" className="flex h-full w-8 items-center justify-center rounded-r-[16px] bg-[#6a37c3] text-white outline-none focus-visible:flex" data-term-card-rail aria-label={t('terms.inspectShowSourceAria')} onClick={() => onSelectedChange?.(true)}><HugeiconsIcon icon={ArrowRight01Icon} size={24} strokeWidth={1.7} /></button></div>}
      {selected && <aside className={`flex self-stretch shrink-0 flex-col items-start justify-between rounded-[16px] bg-[#6a37c3] p-6 text-[#efeaf8] ${expansion === 'fill-parent' ? 'min-w-0 flex-1 max-[1131px]:basis-full max-[1131px]:w-full max-[1131px]:min-h-[13rem] max-[1131px]:flex-none' : 'w-[266px]'}`} data-term-card-source-panel><button type="button" className="size-6 rounded outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label={t('terms.inspectHideSourceAria')} onClick={() => onSelectedChange?.(false)}><HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} /></button><div className="flex w-full flex-col items-start gap-4"><p data-term-card-source-title className="text-[16px] font-medium leading-4">{t('terms.inspectSourceTitle')}</p><div className="h-px w-full rounded bg-[#865bcf]" /><DefinitionMetadata definition={definition} variant="source-panel" /></div></aside>}
    </div>
  );
}
