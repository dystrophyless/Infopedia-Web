import { describe, expect, it } from 'vitest';
import { isSemanticSearchMobileNavHidden } from './semanticSearchNavPolicy';

describe('isSemanticSearchMobileNavHidden', () => {
  it('keeps navigation hidden when the SSE stream ends before a terminal event', () => {
    expect(
      isSemanticSearchMobileNavHidden({
        submitting: false,
        taskId: 'task-1',
        terminalResult: null,
      }),
    ).toBe(true);
  });

  it('keeps navigation hidden when a stale terminal result belongs to another task', () => {
    expect(
      isSemanticSearchMobileNavHidden({
        submitting: false,
        taskId: 'task-2',
        terminalResult: { task_id: 'task-1', status: 'success' },
      }),
    ).toBe(true);
  });

  it.each(['success', 'failure'])('shows navigation after an explicit %s event for the active task', (status) => {
    expect(
      isSemanticSearchMobileNavHidden({
        submitting: false,
        taskId: 'task-1',
        terminalResult: { task_id: 'task-1', status },
      }),
    ).toBe(false);
  });

  it('shows navigation after an intentional reset abandons the task', () => {
    expect(
      isSemanticSearchMobileNavHidden({
        submitting: false,
        taskId: null,
        terminalResult: { task_id: 'task-1', status: 'success' },
      }),
    ).toBe(false);
  });
});
