import { createInstance, type Resource } from 'i18next';
import { describe, expect, it } from 'vitest';
import ru from '../../../locales/ru/translation.json';
import kk from '../../../locales/kk/translation.json';
import * as accuracyDelta from './DesktopTestAccuracyDelta';

type AccuracyDeltaCopy = (t: ReturnType<typeof createInstance>['t'], deltaPoints: number | null | undefined) => {
  label: string;
  explanation: string;
  ariaLabel: string;
};

async function createTranslator(language: 'ru' | 'kk', resource: Resource) {
  const instance = createInstance();
  await instance.init({
    lng: language,
    fallbackLng: 'ru',
    resources: { [language]: { translation: resource } },
    interpolation: { escapeValue: false },
  });
  return instance.t;
}

describe('desktop test accuracy delta locale contract', () => {
  const getCopy = () => {
    const candidate = (accuracyDelta as { getAccuracyDeltaCopy?: AccuracyDeltaCopy }).getAccuracyDeltaCopy;
    expect(candidate).toBeTypeOf('function');
    if (!candidate) throw new Error('getAccuracyDeltaCopy is unavailable');
    return candidate;
  };

  it('uses the Russian source copy and preserves the signed value', async () => {
    const copy = getCopy()(await createTranslator('ru', ru), 5);
    expect(copy).toEqual({
      label: '+5%',
      explanation: 'Изменение в процентных пунктах по сравнению с предыдущим тестом этого типа.',
      ariaLabel: '+5%. Изменение в процентных пунктах по сравнению с предыдущим тестом этого типа.',
    });
  });

  it('uses the Kazakh source copy and preserves a negative value', async () => {
    const copy = getCopy()(await createTranslator('kk', kk), -3);
    expect(copy).toEqual({
      label: '-3%',
      explanation: 'Осы түрдегі алдыңғы тестпен салыстырғандағы пайыздық тармақтар.',
      ariaLabel: '-3%. Осы түрдегі алдыңғы тестпен салыстырғандағы пайыздық тармақтар.',
    });
  });

  it('keeps the unavailable state explicit in localized accessible copy', async () => {
    const copy = getCopy()(await createTranslator('ru', ru), null);
    expect(copy.label).toBe('—');
    expect(copy.ariaLabel).toBe('—. Изменение в процентных пунктах по сравнению с предыдущим тестом этого типа.');
  });
});
