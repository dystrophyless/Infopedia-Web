import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CalendarBlock01Icon, CalendarCheckIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { getUntAnalysisAttempts } from '../api/analyze';
import { Button } from '../ui/atoms';
import { formatUntAnalysisDateRange } from '../features/unt-analysis/model/calendar';
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [internalSelectedAttempt, setInternalSelectedAttempt] = useState<UntAnalysisAttemptId | null>(defaultSelectedAttempt);
  const [serverAttempts, setServerAttempts] = useState<readonly UntAnalysisAttemptAvailability[] | null>(initialAttempts ?? null);
  const [loading, setLoading] = useState(initialAttempts === undefined);
  const [loadError, setLoadError] = useState(false);
  const [step, setStep] = useState<'attempt' | 'date'>(initialStep);
  const options = decorateUntAnalysisAttemptOptions(serverAttempts ?? []);
  const currentSelectedAttempt = selectedAttempt === undefined ? internalSelectedAttempt : selectedAttempt;
  const selectedOption = options.find((option) => option.id === currentSelectedAttempt);
  const canContinue = !loading && Boolean(selectedOption?.available && !selectedOption.analyzed);

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
    if (!options.some((option) => option.id === attempt && option.available && !option.analyzed)) return;
    if (selectedAttempt === undefined) setInternalSelectedAttempt(attempt);
    onAttemptChange?.(attempt);
  }

  function handleContinue() {
    if (!currentSelectedAttempt || !canContinue) return;
    onContinue?.(currentSelectedAttempt);
    setStep('date');
  }

  function handleDateContinue(date: string) {
    if (!selectedOption?.available || selectedOption.analyzed) return;
    if (onDateContinue) {
      onDateContinue(date);
      return;
    }

    const params = new URLSearchParams({
      untAttemptId: selectedOption.id,
      untAttemptDate: date,
    });
    navigate({ pathname: '/analyze', search: `?${params.toString()}` });
  }

  if (step === 'date' && selectedOption?.available && !selectedOption.analyzed) {
    return (
      <UntAnalysisDatePage
        attemptId={selectedOption.id}
        startDate={selectedOption.startDate}
        endDate={selectedOption.endDate}
        onAttemptChange={() => setStep('attempt')}
        onDateChange={onDateChange}
        onBack={() => setStep('attempt')}
        onContinue={handleDateContinue}
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
              const active = option.available && !option.analyzed;
              const selected = currentSelectedAttempt === option.id && !option.analyzed;
              const isGrantAttempt = option.id === 'grant-1' || option.id === 'grant-2';
              const titleClass = option.analyzed
                ? 'text-[#6e6779]'
                : selected
                ? 'text-[#161519]'
                : active
                  ? 'text-[#161519] md:text-[#524d5b]'
                  : isGrantAttempt
                    ? 'text-[#524d5b] md:text-[#6e6779]'
                    : 'text-[#524d5b]';
              const descriptionClass = option.analyzed
                ? 'text-[#b1acb9]'
                : selected
                ? 'text-[#6e6779]'
                : active
                  ? 'text-[#6e6779] md:text-[#8c8698]'
                  : isGrantAttempt
                    ? 'text-[#8c8698] md:text-[#b1acb9]'
                    : 'text-[#8c8698]';
              const iconClass = selected ? 'bg-[#6a37c3] text-white' : option.analyzed ? 'bg-[#efeaf8] text-[#865bcf]' : active ? 'bg-[#f6f5f7] text-[#865bcf]' : 'bg-[#f6f5f7] text-[#c5b1e7]';
              const icon = active || selected || option.analyzed ? CalendarCheckIcon : CalendarBlock01Icon;
              const rowSurfaceClass = option.analyzed
                ? 'bg-[#f6f5f7]'
                : selected
                ? 'bg-[#f8f5fc]'
                : active
                  ? 'bg-white'
                  : 'bg-white md:bg-[#f6f5f7] md:opacity-[0.65]';
              const upcomingLabel = option.startDate && option.endDate
                ? formatUntAnalysisDateRange(option.startDate, option.endDate, i18n.language, ' - ')
                : t('untAnalysis.attempts.notYetHeld');

              return (
                <div key={option.id}>
                  <label
                    htmlFor={`unt-analysis-${option.id}`}
                    className={`flex min-h-[96px] w-full items-start justify-between gap-3 rounded-[8px] px-4 py-4 text-left outline-none transition-colors has-[:disabled]:cursor-not-allowed has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#6a37c3] has-[:focus-visible]:ring-inset md:items-center md:gap-6 md:px-8 md:py-6 ${rowSurfaceClass} ${active ? 'cursor-pointer hover:bg-[#f8f5fc]' : ''}`}
                    data-unt-analysis-option={option.id}
                    data-unt-analysis-available={option.available}
                    data-unt-analysis-selectable={active}
                    data-unt-analysis-upcoming={option.upcoming}
                    data-unt-analysis-analyzed={option.analyzed}
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

                    <span className="flex shrink-0 flex-col items-end gap-2">
                      <span className="relative mt-1 flex size-5 shrink-0 items-center justify-center md:mt-0">
                        <input
                          id={`unt-analysis-${option.id}`}
                          type="radio"
                          name="unt-analysis-attempt"
                          value={option.id}
                          checked={selected}
                          disabled={!active}
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
                      {option.analyzed ? (
                        <span
                          className="hidden items-center justify-center rounded-full bg-[#ded2f1] px-2 py-1 text-[12px] font-medium leading-[12px] text-[#865bcf] md:flex"
                          data-unt-analysis-analyzed-badge
                        >
                          {t('untAnalysis.attempts.analyzed')}
                        </span>
                      ) : option.upcoming && (
                        <span className="hidden items-center justify-center rounded-full bg-[#eae9ec] px-2 py-1 text-[12px] font-medium leading-[12px] text-[#6e6779] md:flex">
                          {upcomingLabel}
                        </span>
                      )}
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
