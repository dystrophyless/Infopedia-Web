import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, GlobalIcon } from '@hugeicons/core-free-icons';
import { useLangStore, type Language } from '../stores/langStore';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const labelFor = (l: Language) =>
    l === 'ru' ? t('common.russian') : t('common.kazakh');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-2 text-[16px] text-muted hover:text-accent transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {compact && <HugeiconsIcon icon={GlobalIcon} size={18} strokeWidth={1.5} />}
        <span>{labelFor(lang)}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 w-40 rounded-[10px] border border-border bg-surface shadow-feature z-50 overflow-hidden"
        >
          {(['ru', 'kk'] as Language[]).map((l) => (
            <li key={l}>
              <button
                type="button"
                onClick={() => {
                  setLang(l);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-[15px] hover:bg-bg ${
                  lang === l ? 'text-accent font-medium' : 'text-text-body'
                }`}
                role="option"
                aria-selected={lang === l}
              >
                {labelFor(l)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
