import { describe, expect, it } from 'vitest';
import * as desktopProgress from './desktopProgress';

type ProgressApi = {
  createAnalyzeProgressSnapshot: () => ProgressSnapshot;
  getAnalyzeProgressPhaseForPercent: (percent: number) => number;
  getAnalyzeDesktopProgressSteps: (input: Record<string, unknown> | ProgressSnapshot) => readonly string[];
  syncAnalyzeProgressSnapshot: (
    snapshot: ProgressSnapshot,
    input: Record<string, unknown>,
    override?: { percent?: number; sourceReferenceOnly?: boolean },
  ) => ProgressSnapshot;
  tickAnalyzeProgressSnapshot: (snapshot: ProgressSnapshot, input: Record<string, unknown>) => ProgressSnapshot;
};

interface ProgressSnapshot {
  taskId: string | null;
  phase: number;
  percent: number;
  effectiveStage: string;
  terminalSuccess: boolean;
}

const api = desktopProgress as unknown as ProgressApi;

function task(stage: string, taskId = 'task-1', status = 'started') {
  return { taskId, hasTask: true, status, stage };
}

function bareTask(status: string, taskId = 'task-1') {
  return { taskId, hasTask: true, status };
}

describe('Analyze progress phase allocation', () => {
  it.each([
    { name: 'submission before a task exists', input: { hasTask: false }, phase: 0 },
    { name: 'pending task', input: task('pending', 'task-1', 'pending'), phase: 0 },
    { name: 'bare started task', input: bareTask('started'), phase: 0 },
    { name: 'explicit started stage', input: task('started'), phase: 0 },
    { name: 'extracting task', input: task('extracting'), phase: 1 },
    { name: 'accepted extraction', input: task('extraction_accepted'), phase: 1 },
    { name: 'in-progress extraction', input: task('extraction_processing'), phase: 1 },
    { name: 'legacy accepted extraction', input: task('llmwhisperer_accepted'), phase: 1 },
    { name: 'legacy in-progress extraction', input: task('llmwhisperer_processing'), phase: 1 },
    { name: 'unknown active nonterminal stage', input: task('future_pipeline_stage'), phase: 1 },
    { name: 'completed extraction', input: task('extraction_completed'), phase: 2 },
    { name: 'legacy completed extraction', input: task('llmwhisperer_processed'), phase: 2 },
    { name: 'parsing task', input: task('parsing'), phase: 2 },
    { name: 'saving task', input: task('saving'), phase: 2 },
    { name: 'book matching task', input: task('matching_books'), phase: 3 },
  ])('$name enters the truthful phase floor', ({ input, phase }) => {
    const actual = api.syncAnalyzeProgressSnapshot(api.createAnalyzeProgressSnapshot(), input);

    expect(actual.phase).toBe(phase);
    expect(actual.percent).toBe([0, 15, 60, 80][phase]);
  });

  it.each([
    [0, 0],
    [14, 0],
    [15, 1],
    [59, 1],
    [60, 2],
    [79, 2],
    [80, 3],
    [99, 3],
    [100, 4],
  ])('maps %s percent to display phase %s', (percent, phase) => {
    expect(api.getAnalyzeProgressPhaseForPercent(percent)).toBe(phase);
  });

  it.each([
    { phase: 0, start: 13.9, ceiling: 14, input: { hasTask: false } },
    { phase: 1, start: 58.9, ceiling: 59, input: task('extraction_processing') },
    { phase: 2, start: 78.9, ceiling: 79, input: task('parsing') },
    { phase: 3, start: 98.9, ceiling: 99, input: task('matching_books') },
  ])('a 450ms tick never crosses the $ceiling ceiling', ({ phase, start, ceiling, input }) => {
    const seeded = { ...api.createAnalyzeProgressSnapshot(), taskId: phase === 0 ? null : 'task-1', phase, percent: start };
    const atCeiling = api.tickAnalyzeProgressSnapshot(seeded, input);

    expect(atCeiling.percent).toBe(ceiling);
    expect(api.tickAnalyzeProgressSnapshot(atCeiling, input).percent).toBe(ceiling);
  });

  it.each([
    { name: 'pending', input: task('pending', 'task-1', 'pending') },
    { name: 'bare started', input: bareTask('started') },
  ])('$name stays in file-check progress through repeated ticks', ({ input }) => {
    const seeded = { ...api.createAnalyzeProgressSnapshot(), taskId: 'task-1', percent: 13.9 };
    const atCeiling = api.tickAnalyzeProgressSnapshot(seeded, input);

    expect(atCeiling).toMatchObject({ phase: 0, percent: 14, effectiveStage: 'pending' });
    expect(api.tickAnalyzeProgressSnapshot(atCeiling, input).percent).toBe(14);
  });

  it('advances ordered pending to started to extracting only when extraction is observed', () => {
    const pending = api.syncAnalyzeProgressSnapshot(
      api.createAnalyzeProgressSnapshot(),
      task('pending', 'task-1', 'pending'),
    );
    const started = api.syncAnalyzeProgressSnapshot(pending, bareTask('started'));
    const extracting = api.syncAnalyzeProgressSnapshot(started, task('extracting'));

    expect(pending).toMatchObject({ phase: 0, percent: 0 });
    expect(started).toMatchObject({ phase: 0, percent: 0 });
    expect(extracting).toMatchObject({ phase: 1, percent: 15 });
  });

  it('uses the approved proportional tick rounded to one decimal', () => {
    const snapshot = { ...api.createAnalyzeProgressSnapshot(), taskId: 'task-1', phase: 1, percent: 40 };

    expect(api.tickAnalyzeProgressSnapshot(snapshot, task('extraction_processing')).percent).toBe(41.4);
  });

  it('does not roll back after parsing receives a stale pending event', () => {
    const parsing = api.syncAnalyzeProgressSnapshot(api.createAnalyzeProgressSnapshot(), task('parsing'));
    const progressed = { ...parsing, percent: 70 };

    expect(api.syncAnalyzeProgressSnapshot(progressed, task('pending', 'task-1', 'pending'))).toEqual(progressed);
  });

  it('does not roll back after parsing receives a stale bare started event', () => {
    const parsing = api.syncAnalyzeProgressSnapshot(api.createAnalyzeProgressSnapshot(), task('parsing'));
    const progressed = { ...parsing, percent: 70 };

    expect(api.syncAnalyzeProgressSnapshot(progressed, bareTask('started'))).toEqual(progressed);
  });

  it('does not roll back after matching receives a stale extraction event', () => {
    const matching = api.syncAnalyzeProgressSnapshot(api.createAnalyzeProgressSnapshot(), task('matching_books'));
    const progressed = { ...matching, percent: 88 };

    expect(api.syncAnalyzeProgressSnapshot(progressed, task('extraction_processing'))).toEqual(progressed);
  });

  it('freezes the last snapshot on failure', () => {
    const previous = {
      ...api.syncAnalyzeProgressSnapshot(api.createAnalyzeProgressSnapshot(), task('parsing')),
      percent: 73.2,
    };

    expect(api.syncAnalyzeProgressSnapshot(previous, task('parsing', 'task-1', 'failure'))).toEqual(previous);
  });

  it.each(['success', 'completed'])('%s is the only terminal 100 percent state with every step done', (terminal) => {
    const snapshot = api.syncAnalyzeProgressSnapshot(
      api.createAnalyzeProgressSnapshot(),
      task(terminal, 'task-1', terminal),
    );

    expect(snapshot).toMatchObject({ percent: 100, terminalSuccess: true });
    expect(api.getAnalyzeDesktopProgressSteps(snapshot)).toEqual(['done', 'done', 'done', 'done']);
  });

  it('resets a different task run to zero and keeps pending in file check', () => {
    const previous = api.syncAnalyzeProgressSnapshot(api.createAnalyzeProgressSnapshot(), task('parsing', 'task-1'));
    const reset = api.syncAnalyzeProgressSnapshot(previous, task('pending', 'task-2', 'pending'));

    expect(reset).toMatchObject({ taskId: 'task-2', phase: 0, percent: 0, effectiveStage: 'pending' });
    const pending = api.syncAnalyzeProgressSnapshot(reset, task('pending', 'task-2', 'pending'));
    expect(pending.percent).toBe(0);
    expect(api.syncAnalyzeProgressSnapshot(pending, task('extracting', 'task-2')).percent).toBe(15);
  });

  it('adopts a pending task in the same file-check run without advancing extraction', () => {
    const submitting = api.createAnalyzeProgressSnapshot();

    expect(api.syncAnalyzeProgressSnapshot(submitting, task('pending', 'task-1', 'pending'))).toMatchObject({
      taskId: 'task-1',
      phase: 0,
      percent: 0,
    });
  });

  it('clamps deterministic extraction overrides to 59 while analysis may display 78', () => {
    const extraction = api.syncAnalyzeProgressSnapshot(
      api.createAnalyzeProgressSnapshot(),
      task('extraction_processing'),
      { percent: 78 },
    );
    const analysis = api.syncAnalyzeProgressSnapshot(
      api.createAnalyzeProgressSnapshot(),
      task('parsing'),
      { percent: 78 },
    );

    expect(extraction.percent).toBe(59);
    expect(analysis.percent).toBe(78);
  });

  it('keeps the approved 42 percent only for an explicit source-reference snapshot', () => {
    const sourceReference = api.syncAnalyzeProgressSnapshot(
      api.createAnalyzeProgressSnapshot(),
      task('parsing'),
      { percent: 42, sourceReferenceOnly: true },
    );

    expect(sourceReference).toMatchObject({ phase: 2, percent: 42 });
  });

  it('never lets a nonterminal source reference claim 100 percent', () => {
    const sourceReference = api.syncAnalyzeProgressSnapshot(
      api.createAnalyzeProgressSnapshot(),
      task('matching_books'),
      { percent: 100, sourceReferenceOnly: true },
    );

    expect(sourceReference.percent).toBe(99);
    expect(sourceReference.terminalSuccess).toBe(false);
  });
});
