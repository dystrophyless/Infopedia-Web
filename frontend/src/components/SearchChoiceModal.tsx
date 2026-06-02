import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowRight02Icon,
  Cancel01Icon,
  FileSearchIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';

interface SearchChoiceModalProps {
  termSearchTo: string;
  descriptionSearchTo: string;
  onClose: () => void;
}

export function SearchChoiceModal({
  termSearchTo,
  descriptionSearchTo,
  onClose,
}: SearchChoiceModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const options = [
    {
      to: termSearchTo,
      icon: Search01Icon,
      title: t('searchChoice.termTitle'),
      description: t('searchChoice.termDescription'),
    },
    {
      to: descriptionSearchTo,
      icon: FileSearchIcon,
      title: t('searchChoice.descriptionTitle'),
      description: t('searchChoice.descriptionDescription'),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#12091f]/65 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        ref={dialogRef}
        aria-describedby="search-choice-description"
        aria-labelledby="search-choice-title"
        aria-modal="true"
        className="max-h-[calc(100dvh-32px)] w-full max-w-[560px] overflow-y-auto rounded-[10px] border border-border/70 bg-surface shadow-[0_18px_54px_rgba(18,9,31,0.22)] outline-none"
        role="dialog"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-5 px-6 pb-5 pt-6 max-sm:px-5">
          <div className="min-w-0">
            <h2
              id="search-choice-title"
              className="text-[28px] font-medium leading-tight text-primary max-sm:text-[24px]"
            >
              {t('searchChoice.title')}
            </h2>
            <p
              id="search-choice-description"
              className="mt-2 max-w-[455px] text-[15px] leading-6 text-text-body max-sm:text-[14px] max-sm:leading-5"
            >
              {t('searchChoice.description')}
            </p>
          </div>

          <button
            type="button"
            aria-label={t('searchChoice.close')}
            className="flex size-10 shrink-0 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-bg hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none max-sm:size-9"
            onClick={onClose}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-border/35 px-6 pb-6 pt-4 max-sm:px-5">
          {options.map((option) => (
            <Link
              key={option.to}
              to={option.to}
              className="group grid min-h-[82px] grid-cols-[38px_minmax(0,1fr)_18px] items-center gap-3 rounded-[8px] border border-border/55 bg-surface px-4 py-3.5 text-left transition-colors duration-150 hover:border-accent hover:bg-bg/70 focus-visible:border-accent focus-visible:bg-bg/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none max-sm:min-h-[78px] max-sm:grid-cols-[34px_minmax(0,1fr)] max-sm:gap-3 max-sm:px-3.5"
              onClick={onClose}
            >
              <span
                className="flex size-[38px] items-center justify-center rounded-[8px] bg-bg text-primary transition-colors duration-150 group-hover:bg-surface group-focus-visible:bg-surface motion-reduce:transition-none max-sm:size-[34px]"
                aria-hidden="true"
              >
                <HugeiconsIcon
                  icon={option.icon}
                  size={21}
                  strokeWidth={1.8}
                  className="max-sm:size-5"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-[18px] font-medium leading-tight text-primary max-sm:text-[16px]">
                  {option.title}
                </span>
                <span className="mt-1 block text-[14px] leading-5 text-text-body max-sm:text-[13px] max-sm:leading-[1.35]">
                  {option.description}
                </span>
              </span>
              <HugeiconsIcon
                icon={ArrowRight02Icon}
                size={18}
                strokeWidth={1.8}
                className="justify-self-end text-muted transition-colors duration-150 group-hover:text-accent group-focus-visible:text-accent motion-reduce:transition-none max-sm:hidden"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
