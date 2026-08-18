type TerminalSearchResult = {
  task_id?: string | null;
  status?: string | null;
} | null;

export type SemanticSearchNavState = {
  submitting: boolean;
  taskId: string | null;
  terminalResult: TerminalSearchResult;
};

const TERMINAL_STATUSES = new Set(['success', 'failure']);

export function isSemanticSearchMobileNavHidden({ submitting, taskId, terminalResult }: SemanticSearchNavState): boolean {
  if (submitting) return true;
  if (!taskId) return false;

  return !(terminalResult?.task_id === taskId && TERMINAL_STATUSES.has(terminalResult.status ?? ''));
}
