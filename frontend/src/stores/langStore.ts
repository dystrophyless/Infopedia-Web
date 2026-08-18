import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';

export type Language = 'ru' | 'kk';

interface LangState {
  lang: Language;
  setLang: (lang: Language) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'ru',
      setLang: (lang) => {
        set({ lang });
        void i18n.changeLanguage(lang);
      },
    }),
    {
      name: 'infopedia_lang',
    }
  )
);
