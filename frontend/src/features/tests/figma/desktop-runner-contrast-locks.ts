/**
 * Narrow axe exception inventory for the seven approved desktop Tests frames.
 *
 * Figma file: aa8qReawBBhHIXDAbS18OP. Each entry names the exact rendered
 * foreground/background pair and the top-level source frames where that pair
 * was confirmed. The Storybook rule selector exempts these exact lock values
 * from `color-contrast` only; axe continues to run every other rule on them.
 * Runtime assertions below lock the per-story node count and computed palette,
 * so reusing an id, broadening the inventory, or drifting a source color fails.
 */
export const FIGMA_CONTRAST_LOCKS = {
  'question-exit': { foreground: '#f69a93', background: '#fdf2f1', sourceNodes: ['880:4071', '886:4620', '891:4728', '918:4311', '891:5134'] },
  'question-meta': { foreground: '#c5b1e7', background: '#ffffff', sourceNodes: ['880:4071', '886:4620', '891:4728', '918:4311', '891:5134'] },
  'question-status-answered': { foreground: '#865bcf', background: '#efeaf8', sourceNodes: ['886:4620', '891:4728', '918:4311', '891:5134'] },
  'question-status-skipped': { foreground: '#c5b1e7', background: '#f8f5fc', sourceNodes: ['886:4620', '891:4728', '918:4311', '891:5134'] },
  'question-status-upcoming': { foreground: '#c5b1e7', background: '#f8f5fc', sourceNodes: ['880:4071', '886:4620', '891:4728', '918:4311', '891:5134'] },
  'question-feedback-correct-title': { foreground: '#29ae70', background: '#e7f8f0', sourceNodes: ['918:4311'] },
  'question-feedback-correct-body': { foreground: '#21835a', background: '#e7f8f0', sourceNodes: ['918:4311'] },
  'question-feedback-wrong-title': { foreground: '#f25f54', background: '#fce5e3', sourceNodes: ['891:5134'] },
  'results-exit': { foreground: '#f69a93', background: '#fdf2f1', sourceNodes: ['910:4101', '921:4432'] },
  'results-score-eyebrow': { foreground: '#b1acb9', background: '#ffffff', sourceNodes: ['910:4101', '921:4432'] },
  'results-score-fraction': { foreground: '#8c8698', background: '#ffffff', sourceNodes: ['910:4101', '921:4432'] },
  'results-delta': { foreground: '#29ae70', background: '#cbf0df', sourceNodes: ['910:4101', '921:4432'] },
  'results-secondary-action': { foreground: '#865bcf', background: '#efeaf8', sourceNodes: ['910:4101', '921:4432'] },
  'results-pace-label': { foreground: '#8c8698', background: '#ffffff', sourceNodes: ['910:4101', '921:4432'] },
  'results-overview-correct': { foreground: '#6ed8a7', background: '#e7f8f0', sourceNodes: ['910:4101', '921:4432'] },
  'results-overview-wrong': { foreground: '#f25f54', background: '#fce5e3', sourceNodes: ['910:4101', '921:4432'] },
  'results-overview-unavailable': { foreground: '#c5b1e7', background: '#f8f5fc', sourceNodes: ['910:4101', '921:4432'] },
  'review-meta': { foreground: '#c5b1e7', background: '#ffffff', sourceNodes: ['921:4432'] },
  'review-feedback-wrong-title': { foreground: '#f25f54', background: '#fce5e3', sourceNodes: ['921:4432'] },
} as const;

export type FigmaContrastLockId = keyof typeof FIGMA_CONTRAST_LOCKS;
export type FigmaContrastStory = 'DefaultQuestion1' | 'Question7WithSkipped4' | 'SelectedAnswer' | 'CorrectFeedback' | 'WrongFeedback' | 'Results' | 'QuestionReviewDialog';

const exactLockSelector = (id: FigmaContrastLockId) => `[data-figma-contrast-lock="${id}"]`;

// Axe accepts a rule-specific selector. This negated chain leaves every node in
// the audit except the exact inventory values above, and only for color-contrast.
export const FIGMA_CONTRAST_RULE_SELECTOR = `*${(Object.keys(FIGMA_CONTRAST_LOCKS) as FigmaContrastLockId[]).map((id) => `:not(${exactLockSelector(id)})`).join('')}`;
const FIGMA_CONTRAST_NODE_SELECTOR = (Object.keys(FIGMA_CONTRAST_LOCKS) as FigmaContrastLockId[]).map(exactLockSelector).join(',');

const questionOne = { 'question-exit': 1, 'question-meta': 1, 'question-status-upcoming': 14 };
const questionSeven = { 'question-exit': 1, 'question-meta': 1, 'question-status-answered': 5, 'question-status-skipped': 1, 'question-status-upcoming': 8 };
const results = {
  'results-exit': 1,
  'results-score-eyebrow': 1,
  'results-score-fraction': 1,
  'results-delta': 1,
  'results-secondary-action': 1,
  'results-pace-label': 2,
  'results-overview-correct': 12,
  'results-overview-wrong': 2,
  'results-overview-unavailable': 1,
};

export const FIGMA_CONTRAST_EXPECTATIONS: Record<FigmaContrastStory, Partial<Record<FigmaContrastLockId, number>>> = {
  DefaultQuestion1: questionOne,
  Question7WithSkipped4: questionSeven,
  SelectedAnswer: questionSeven,
  CorrectFeedback: { ...questionSeven, 'question-feedback-correct-title': 1, 'question-feedback-correct-body': 1 },
  WrongFeedback: { ...questionSeven, 'question-feedback-wrong-title': 1 },
  Results: results,
  QuestionReviewDialog: { ...results, 'review-meta': 1, 'review-feedback-wrong-title': 1 },
};

const hexToRgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${value >> 16}, ${(value >> 8) & 255}, ${value & 255})`;
};

const effectiveBackgroundColor = (element: HTMLElement) => {
  let current: HTMLElement | null = element;
  while (current) {
    const color = getComputedStyle(current).backgroundColor;
    if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
    current = current.parentElement;
  }
  return 'rgba(0, 0, 0, 0)';
};

export function assertFigmaContrastLocks(canvasElement: HTMLElement, story: FigmaContrastStory) {
  const document = canvasElement.ownerDocument;
  const expected = FIGMA_CONTRAST_EXPECTATIONS[story];
  const elements = [...document.querySelectorAll<HTMLElement>(FIGMA_CONTRAST_NODE_SELECTOR)];
  const actualCounts: Partial<Record<FigmaContrastLockId, number>> = {};

  for (const element of elements) {
    const id = element.dataset.figmaContrastLock as FigmaContrastLockId;
    const lock = FIGMA_CONTRAST_LOCKS[id];
    if (!lock) throw new Error(`Unapproved Figma contrast lock: ${id}`);
    actualCounts[id] = (actualCounts[id] ?? 0) + 1;
    const style = getComputedStyle(element);
    const background = effectiveBackgroundColor(element);
    if (style.color !== hexToRgb(lock.foreground) || background !== hexToRgb(lock.background)) {
      throw new Error(`${story}/${id} color drift: ${style.color}/${background}; expected ${lock.foreground}/${lock.background}`);
    }
  }

  for (const id of Object.keys(FIGMA_CONTRAST_LOCKS) as FigmaContrastLockId[]) {
    const expectedCount = expected[id] ?? 0;
    const actualCount = actualCounts[id] ?? 0;
    if (actualCount !== expectedCount) throw new Error(`${story}/${id} inventory drift: found ${actualCount}, expected ${expectedCount}`);
  }
}
