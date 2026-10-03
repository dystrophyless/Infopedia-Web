export type UntAnalysisAttemptId = 'january' | 'march' | 'grant-1' | 'grant-2';

export interface UntAnalysisAttemptAvailability {
  id: UntAnalysisAttemptId;
  start_date: string | null;
  end_date: string | null;
  available: boolean;
  upcoming?: boolean;
  analyzed?: boolean;
}

export interface UntAnalysisAttemptOption {
  id: UntAnalysisAttemptId;
  titleKey: string;
  descriptionKey: string;
  startDate: string | null;
  endDate: string | null;
  available: boolean;
  upcoming: boolean;
  analyzed: boolean;
}

const ATTEMPT_DEFINITIONS: ReadonlyArray<
  Pick<UntAnalysisAttemptOption, 'id' | 'titleKey' | 'descriptionKey'>
> = [
  {
    id: 'january',
    titleKey: 'untAnalysis.attempts.january.title',
    descriptionKey: 'untAnalysis.attempts.january.description',
  },
  {
    id: 'march',
    titleKey: 'untAnalysis.attempts.march.title',
    descriptionKey: 'untAnalysis.attempts.march.description',
  },
  {
    id: 'grant-1',
    titleKey: 'untAnalysis.attempts.grant-1.title',
    descriptionKey: 'untAnalysis.attempts.grant-1.description',
  },
  {
    id: 'grant-2',
    titleKey: 'untAnalysis.attempts.grant-2.title',
    descriptionKey: 'untAnalysis.attempts.grant-2.description',
  },
];

export function decorateUntAnalysisAttemptOptions(
  attempts: readonly UntAnalysisAttemptAvailability[],
): UntAnalysisAttemptOption[] {
  const serverOptions = new Map(attempts.map((attempt) => [attempt.id, attempt]));

  return ATTEMPT_DEFINITIONS.map((definition) => {
    const serverOption = serverOptions.get(definition.id);

    return {
      ...definition,
      startDate: serverOption?.start_date ?? null,
      endDate: serverOption?.end_date ?? null,
      available: serverOption?.available ?? false,
      upcoming: serverOption?.upcoming ?? false,
      analyzed: serverOption?.analyzed ?? false,
    };
  });
}
