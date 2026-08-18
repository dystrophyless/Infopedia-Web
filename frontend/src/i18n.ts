import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

const stored = (() => {
  if (typeof window === 'undefined') return 'ru';
  try {
    const raw = localStorage.getItem('infopedia_lang');
    if (!raw) return 'ru';
    const parsed = JSON.parse(raw);
    return parsed?.state?.lang ?? 'ru';
  } catch {
    return 'ru';
  }
})();

void i18n
  .use(
    resourcesToBackend(
      (lng: string) => import(`./locales/${lng}/translation.json`)
    )
  )
  .use(initReactI18next)
  .init({
    lng: stored,
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'kk'],
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
