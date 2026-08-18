export type AnalyzeDesktopProgressStepState = 'done' | 'current' | 'next';
export type AnalyzeProgressPhase = 0 | 1 | 2 | 3;

export interface AnalyzeProgressInput {
  taskId?: string | null;
  hasTask: boolean;
  status?: string | null;
  stage?: string | null;
}

export interface AnalyzeProgressSnapshot {
  taskId: string | null;
  phase: AnalyzeProgressPhase;
  percent: number;
  effectiveStage: string;
  terminalSuccess: boolean;
}

export interface AnalyzeProgressOverride {
  percent?: number;
  sourceReferenceOnly?: boolean;
}

const PHASE_FLOORS: Record<AnalyzeProgressPhase, number> = {
  0: 0,
  1: 15,
  2: 60,
  3: 80,
};

const PHASE_CEILINGS: Record<AnalyzeProgressPhase, number> = {
  0: 14,
  1: 59,
  2: 79,
  3: 99,
};

const EXTRACTION_COMPLETE_STAGES = new Set([
  'extraction_completed',
  'parsing',
  'saving',
]);

const FILE_CHECK_STAGES = new Set([
  'pending',
  'started',
]);

const STAGE_ALIASES: Record<string, string> = {
  llmwhisperer_accepted: 'extraction_accepted',
  llmwhisperer_processing: 'extraction_processing',
  llmwhisperer_processed: 'extraction_completed',
};

type AnalyzeProgressTarget =
  | { kind: 'active'; phase: AnalyzeProgressPhase }
  | { kind: 'success'; phase: 3 }
  | { kind: 'failure' };

export function createAnalyzeProgressSnapshot(): AnalyzeProgressSnapshot {
  return {
    taskId: null,
    phase: 0,
    percent: 0,
    effectiveStage: 'pending',
    terminalSuccess: false,
  };
}

export function getAnalyzeProgressPhaseForPercent(percent: number): AnalyzeProgressPhase | 4 {
  const clamped = clampPercent(percent);
  if (clamped >= 100) return 4;
  if (clamped >= 80) return 3;
  if (clamped >= 60) return 2;
  if (clamped >= 15) return 1;
  return 0;
}

export function syncAnalyzeProgressSnapshot(
  snapshot: AnalyzeProgressSnapshot,
  input: AnalyzeProgressInput,
  override: AnalyzeProgressOverride = {},
): AnalyzeProgressSnapshot {
  const target = resolveAnalyzeProgressTarget(input);
  if (target.kind === 'failure') return snapshot;

  const incomingTaskId = input.taskId ?? null;
  if (snapshot.taskId && incomingTaskId && snapshot.taskId !== incomingTaskId) {
    return { ...createAnalyzeProgressSnapshot(), taskId: incomingTaskId };
  }

  const taskId = snapshot.taskId ?? incomingTaskId;
  if (target.kind === 'success') {
    return {
      taskId,
      phase: 3,
      percent: 100,
      effectiveStage: 'completed',
      terminalSuccess: true,
    };
  }

  const phase = Math.max(snapshot.phase, target.phase) as AnalyzeProgressPhase;
  const phaseFloor = PHASE_FLOORS[phase];
  let percent = Math.max(snapshot.percent, phaseFloor);

  if (Number.isFinite(override.percent)) {
    const requested = clampPercent(override.percent as number);
    const constrained = override.sourceReferenceOnly
      ? Math.min(99, requested)
      : Math.min(PHASE_CEILINGS[phase], Math.max(phaseFloor, requested));
    percent = Math.max(snapshot.percent, constrained);
  }

  return {
    taskId,
    phase,
    percent,
    effectiveStage: getEffectiveStage(phase),
    terminalSuccess: false,
  };
}

export function tickAnalyzeProgressSnapshot(
  snapshot: AnalyzeProgressSnapshot,
  input: AnalyzeProgressInput,
): AnalyzeProgressSnapshot {
  const target = resolveAnalyzeProgressTarget(input);
  if (target.kind === 'failure') return snapshot;

  const synced = syncAnalyzeProgressSnapshot(snapshot, input);
  if (synced.terminalSuccess || !sameProgressPosition(snapshot, synced)) return synced;

  const ceiling = PHASE_CEILINGS[synced.phase];
  if (synced.percent >= ceiling) return synced;

  const remaining = ceiling - synced.percent;
  const step = Math.min(1.4, Math.max(0.1, remaining * 0.08));
  const percent = Math.min(ceiling, Math.round((synced.percent + step) * 10) / 10);
  return { ...synced, percent };
}

export function getAnalyzeDesktopProgressSteps(
  input: AnalyzeProgressInput | AnalyzeProgressSnapshot,
): readonly AnalyzeDesktopProgressStepState[] {
  const snapshotLike = 'phase' in input;
  const terminalSuccess = snapshotLike
    ? input.terminalSuccess
    : resolveAnalyzeProgressTarget(input).kind === 'success';
  if (terminalSuccess) return ['done', 'done', 'done', 'done'];

  const phase = snapshotLike
    ? input.phase
    : getTargetPhase(resolveAnalyzeProgressTarget(input));

  if (phase === 3) return ['done', 'done', 'done', 'current'];
  if (phase === 2) return ['done', 'done', 'current', 'next'];
  if (phase === 1) return ['done', 'current', 'next', 'next'];
  return ['current', 'next', 'next', 'next'];
}

function resolveAnalyzeProgressTarget(input: AnalyzeProgressInput): AnalyzeProgressTarget {
  if (!input.hasTask) return { kind: 'active', phase: 0 };
  if (input.status === 'failure') return { kind: 'failure' };

  const rawStage = input.stage ?? input.status ?? 'pending';
  const publicStage = STAGE_ALIASES[rawStage] ?? rawStage;
  if (input.status === 'success' || input.status === 'completed' || publicStage === 'success' || publicStage === 'completed') {
    return { kind: 'success', phase: 3 };
  }
  if (publicStage === 'matching_books') return { kind: 'active', phase: 3 };
  if (EXTRACTION_COMPLETE_STAGES.has(publicStage)) return { kind: 'active', phase: 2 };
  if (FILE_CHECK_STAGES.has(publicStage)) return { kind: 'active', phase: 0 };

  // Any unknown nonterminal active stage stays conservative: extraction is in
  // progress, but analysis and personalization have not been proven to start.
  return { kind: 'active', phase: 1 };
}

function getTargetPhase(target: AnalyzeProgressTarget): AnalyzeProgressPhase {
  return target.kind === 'failure' ? 0 : target.phase;
}

function getEffectiveStage(phase: AnalyzeProgressPhase) {
  if (phase === 3) return 'matching_books';
  if (phase === 2) return 'parsing';
  if (phase === 1) return 'extraction_processing';
  return 'pending';
}

function sameProgressPosition(left: AnalyzeProgressSnapshot, right: AnalyzeProgressSnapshot) {
  return left.taskId === right.taskId
    && left.phase === right.phase
    && left.percent === right.percent
    && left.terminalSuccess === right.terminalSuccess;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
