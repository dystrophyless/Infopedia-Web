import { describe, expect, it } from 'vitest';
import * as resultView from './DesktopTestResultView';

type OverviewOrder = (questionCount: number) => number[];

describe('desktop test result overview order', () => {
  const getOrder = () => {
    const candidate = (resultView as { getDesktopResultOverviewOrder?: OverviewOrder })
      .getDesktopResultOverviewOrder;
    expect(candidate).toBeTypeOf('function');
    if (!candidate) throw new Error('getDesktopResultOverviewOrder is unavailable');
    return candidate;
  };

  it.each([
    [0, []],
    [20, Array.from({ length: 20 }, (_, index) => index)],
    [40, Array.from({ length: 40 }, (_, index) => index)],
  ] as const)('returns the complete natural order for %i questions', (questionCount, expected) => {
    expect(getOrder()(questionCount)).toEqual(expected);
  });

  it('preserves the exact 15-question Figma overview order', () => {
    expect(getOrder()(15)).toEqual([0, 1, 2, 3, 4, 8, 5, 6, 7, 9, 10, 11, 13, 12, 14]);
  });

  it.each([0, 15, 20, 40])('contains every in-range index exactly once for %i questions', (questionCount) => {
    const order = getOrder()(questionCount);
    expect(order).toHaveLength(questionCount);
    expect(new Set(order).size).toBe(questionCount);
    expect(order.every(index => index >= 0 && index < questionCount)).toBe(true);
  });
});
