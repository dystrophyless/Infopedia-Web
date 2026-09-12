import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarBlock01Icon, CalendarCheckIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { getUntAnalysisAttempts } from '../api/analyze';
import { Button } from '../ui/atoms';
import {
  decorateUntAnalysisAttemptOptions,
  type UntAnalysisAttemptAvailability,
  type UntAnalysisAttemptId,
} from '../features/unt-analysis/model/attempts';
import { UntAnalysisDatePage } from './UntAnalysisDatePage';

export interface UntAnalysisPageProps {
  initialAttempts?: readonly UntAnalysisAttemptAvailability[];
  initialStep?: 'attempt' | 'date';
  selectedAttempt?: UntAnalysisAttemptId | null;
  defaultSelectedAttempt?: UntAnalysisAttemptId | null;
  onAttemptChange?: (attempt: UntAnalysisAttemptId) => void;
  onContinue?: (attempt: UntAnalysisAttemptId) => void;
  onDateChange?: (date: string) => void;
  onDateContinue?: (date: string) => void;
}

export function UntAnalysisPage({
  initialAttempts,
  initialStep = 'attempt',
  selectedAttempt,
  defaultSelectedAttempt = null,
  onAttemptChange,
  onContinue,
  onDateChange,
  onDateContinue,
}: UntAnalysisPageProps) {
  const { t } = useTranslation();
  const [internalSelectedAttempt, setInternalSelectedAttempt] = useState<UntAnalysisAttemptId | null>(defaultSelectedAttempt);
  const [serverAttempts, setServerAttempts] = useState<readonly UntAnalysisAttemptAvailability[] | null>(initialAttempts ?? null);
  const [loading, setLoading] = useState(initialAttempts === undefined);
  const [loadError, setLoadError] = useState(false);
  const [step, setStep] = useState<'attempt' | 'date'>(initialStep);
  const options = decorateUntAnalysisAttemptOptions(serverAttempts ?? []);
  const currentSelectedAttempt = selectedAttempt === undefined ? internalSelectedAttempt : selectedAttempt;
  const selectedOption = options.find((option) => option.id === currentSelectedAttempt);
  const canContinue = !loading && Boolean(selectedOption?.available);

  useEffect(() => {
    if (initialAttempts !== undefined) {
      setServerAttempts(initialAttempts);
      setLoading(false);
      setLoadError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    getUntAnalysisAttempts()
      .then(({ attempts }) => {
        if (!cancelled) setServerAttempts(attempts);
      })
      .catch(() => {
        if (!cancelled) {
          setServerAttempts([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialAttempts]);

  function handleAttemptChange(attempt: UntAnalysisAttemptId) {
    if (!options.some((option) => option.id === attempt && option.available)) return;
    if (selectedAttempt === undefined) setInternalSelectedAttempt(attempt);
    onAttemptChange?.(attempt);
  }

  function handleContinue() {
    if (!currentSelectedAttempt || !canContinue) return;
    onContinue?.(currentSelectedAttempt);
    setStep('date');
  }

  if (step === 'date' && selectedOption?.available) {
    return (
      <UntAnalysisDatePage
        attemptId={selectedOption.id}
        startDate={selectedOption.startDate}
        endDate={selectedOption.endDate}
        onAttemptChange={() => setStep('attempt')}
        onDateChange={onDateChange}
        onBack={() => setStep('attempt')}
        onContinue={onDateContinue}
      />
    );
  }

  return (
    <div
      className="min-h-screen min-w-0 overflow-x-clip bg-[#efeaf8] px-6 py-6 max-[359px]:px-4 max-[359px]:py-4 md:ml-px md:min-h-[1080px] md:overflow-x-visible md:px-16 md:py-8"
      data-unt-analysis-page
    >
      <main className="w-full">
        <section
          aria-labelledby="unt-analysis-title"
          className="flex min-w-0 w-full max-w-[800px] flex-col gap-6 rounded-[16px] bg-white p-4 md:gap-8 md:p-6"
          aria-busy={loading}
          data-unt-analysis-card
          data-unt-analysis-load-state={loading ? 'loading' : loadError ? 'error' : 'ready'}
        >
          <header className="flex w-full flex-col items-start gap-4">
            <h1 id="unt-analysis-title" className="text-[22px] font-medium leading-[22px] text-[#000000]">
              {t('untAnalysis.title')}
            </h1>
            <p className="max-w-[504px] text-[16px] leading-[16px] text-[#6e6779]">
              {t('untAnalysis.description')}
            </p>
            {loadError && (
              <p className="text-[14px] leading-[14px] text-[#c94a4a]" role="alert">
                {t('untAnalysis.loadError')}
              </p>
            )}
          </header>

          <fieldset
            aria-label={t('untAnalysis.attemptSelectionLabel')}
            className="min-w-0 w-full overflow-hidden rounded-[8px] border border-solid border-[#f6f5f7] p-0"
            data-unt-analysis-options
          >
            <legend className="sr-only">{t('untAnalysis.attemptSelectionLabel')}</legend>
            {options.map((option, index) => {
              const active = option.available;
              const selected = currentSelectedAttempt === option.id;
              const titleClass = active ? 'text-[#161519]' : 'text-[#524d5b]';
              const descriptionClass = active ? 'text-[#6e6779]' : 'text-[#8c8698]';
              const iconClass = selected ? 'bg-[#6a37c3] text-white' : active ? 'bg-[#f6f5f7] text-[#865bcf]' : 'bg-[#f6f5f7] text-[#c5b1e7]';
              const icon = active ? CalendarCheckIcon : CalendarBlock01Icon;

              return (
                <div key={option.id}>
                  <label
                    htmlFor={`unt-analysis-${option.id}`}
                    className={`flex min-h-[96px] w-full items-start justify-between gap-3 rounded-[8px] px-4 py-4 text-left outline-none transition-colors has-[:disabled]:cursor-not-allowed has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#6a37c3] has-[:focus-visible]:ring-inset md:items-center md:gap-6 md:px-8 md:py-6 ${selected ? 'bg-[#f8f5fc]' : 'bg-white'} ${active ? 'cursor-pointer hover:bg-[#f8f5fc]' : ''}`}
                    data-unt-analysis-option={option.id}
                    data-unt-analysis-available={active}
                    data-unt-analysis-selected={selected}
                    data-testid={`unt-analysis-option-${option.id}`}
                  >
                    <span className="flex min-w-0 flex-1 items-start gap-3 md:items-center md:gap-6">
                      <span className={`flex size-12 shrink-0 items-center justify-center rounded-[8px] ${iconClass}`}>
                        <HugeiconsIcon icon={icon} size={24} strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-2">
                        <span className={`break-words text-[18px] font-medium leading-[18px] ${titleClass}`}>
                          {t(option.titleKey)}
                        </span>
                        <span className={`break-words text-[16px] leading-[16px] ${descriptionClass}`}>
                          {t(option.descriptionKey)}
                        </span>
                      </span>
                    </span>

                    <span className="relative mt-1 flex size-5 shrink-0 items-center justify-center md:mt-0">
                      <input
                        id={`unt-analysis-${option.id}`}
                        type="radio"
                        name="unt-analysis-attempt"
                        value={option.id}
                        checked={currentSelectedAttempt === option.id}
                        disabled={!option.available}
                        onChange={() => handleAttemptChange(option.id)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        data-unt-analysis-selection-indicator
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#6a37c3] peer-focus-visible:ring-offset-2 ${selected ? 'bg-[#6a37c3] text-white' : 'border border-[#c5b1e7]'}`}
                      >
                        {selected && <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2} aria-hidden="true" />}
                      </span>
                    </span>
                  </label>
                  {index < options.length - 1 && <div className="h-px w-full bg-[#f6f5f7]" aria-hidden="true" />}
                </div>
              );
            })}
          </fieldset>

          <div className="flex w-full items-center justify-end">
            <Button
              type="button"
              disabled={!canContinue}
              onClick={handleContinue}
              size="sm"
              className={`h-12 min-h-12 w-full rounded-[8px] px-6 py-3 text-[16px] font-medium leading-4 disabled:opacity-100 md:h-10 md:min-h-10 md:w-auto ${canContinue ? 'bg-[#6a37c3] text-white' : 'bg-[#efeaf8] text-[#a585db]'}`}
              data-unt-analysis-continue
            >
              {t('untAnalysis.continue')}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default UntAnalysisPage;
