import { describe, expect, it } from 'vitest';
import {
  decorateUntAnalysisAttemptOptions,
  type UntAnalysisAttemptAvailability,
} from './attempts';

const serverAttempts: UntAnalysisAttemptAvailability[] = [
  { id: 'january', available: true, start_date: '2026-01-10', end_date: '2026-02-10', analyzed: true },
  { id: 'march', available: false, start_date: '2026-03-01', end_date: '2026-04-30' },
  { id: 'grant-1', available: false, start_date: null, end_date: null },
  { id: 'grant-2', available: false, start_date: null, end_date: null },
];

describe('decorateUntAnalysisAttemptOptions', () => {
  it('uses backend availability without deriving it from a browser date', () => {
    const options = decorateUntAnalysisAttemptOptions(serverAttempts);

    expect(options.map(({ id, available }) => ({ id, available }))).toEqual([
      { id: 'january', available: true },
      { id: 'march', available: false },
      { id: 'grant-1', available: false },
      { id: 'grant-2', available: false },
    ]);
    expect(options[0]).toMatchObject({
      startDate: '2026-01-10',
      endDate: '2026-02-10',
    });
  });

  it('fails closed when the server omits an attempt', () => {
    const options = decorateUntAnalysisAttemptOptions([
      { id: 'january', available: true, start_date: '2026-01-10', end_date: '2026-02-10' },
    ]);

    expect(options).toHaveLength(4);
    expect(options.filter(({ available }) => available).map(({ id }) => id)).toEqual(['january']);
  });

  it('preserves the server analyzed status independently from availability', () => {
    const options = decorateUntAnalysisAttemptOptions(serverAttempts);

    expect(options[0]).toMatchObject({ analyzed: true, available: true });
    expect(options[1]).toMatchObject({ analyzed: false, available: false });
  });
});
