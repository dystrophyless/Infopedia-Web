import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FigmaFeatureSearchIcon } from './FigmaIcons';

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
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-[10px]"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        aria-labelledby="search-choice-title"
        aria-modal="true"
        className="flex h-[434px] max-h-[calc(100vh-32px)] w-[min(672px,calc(100vw-32px))] flex-col items-center justify-between overflow-hidden rounded-[15px] border border-[#595959] bg-surface p-[70px] shadow-[0_4px_2px_rgba(0,0,0,0.25)] max-md:h-auto max-md:min-h-[390px] max-md:p-8"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex w-full flex-col items-center gap-5">
          <div className="flex w-full items-center justify-center gap-5">
            <div className="flex size-[45.4px] shrink-0 items-center justify-center rounded-[10px] bg-primary text-surface">
              <FigmaFeatureSearchIcon className="block size-[21px]" />
            </div>
            <h2
              id="search-choice-title"
              className="text-center text-[44px] font-medium leading-[1] text-primary"
            >
              Поиск
            </h2>
          </div>
          <p className="whitespace-nowrap text-[20px] font-medium leading-[1] text-muted">
            Как вы хотите искать?
          </p>
        </div>

        <div className="flex w-full flex-col gap-5">
          <Link
            to={termSearchTo}
            className="flex h-[72px] w-full items-center justify-center overflow-hidden rounded-[15px] bg-bg px-10 py-[25px] text-[22px] font-medium leading-[1] text-secondary shadow-feature transition-opacity hover:opacity-90"
            onClick={onClose}
          >
            По названию термина
          </Link>
          <Link
            to={descriptionSearchTo}
            className="flex h-[72px] w-full items-center justify-center overflow-hidden rounded-[15px] bg-bg px-10 py-[25px] text-[22px] font-medium leading-[1] text-secondary shadow-feature transition-opacity hover:opacity-90"
            onClick={onClose}
          >
            По описанию термина
          </Link>
        </div>
      </section>
    </div>
  );
}
