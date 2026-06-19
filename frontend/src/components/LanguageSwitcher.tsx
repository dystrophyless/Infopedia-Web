import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useLangStore, type Language } from '../stores/langStore';

const LANGS: Language[] = ['ru', 'kk'];

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Only register the outside-click listener while the dropdown is open
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Move DOM focus to the currently-selected option when the dropdown opens
  useEffect(() => {
    if (!open) return;
    const idx = LANGS.indexOf(lang);
    optionRefs.current[idx >= 0 ? idx : 0]?.focus();
  }, [open, lang]);

  const labelFor = (l: Language) =>
    l === 'ru' ? t('common.russian') : t('common.kazakh');

  function handleOptionKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      optionRefs.current[Math.min(index + 1, LANGS.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      optionRefs.current[Math.max(index - 1, 0)]?.focus();
    } else if (e.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  function selectLang(l: Language) {
    setLang(l);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-[5px] px-2 py-2 text-[16px] text-muted transition-colors hover:text-accent"
        aria-haspopup="menu"
        aria-controls="lang-menu"
        aria-expanded={open}
      >
        <span>{labelFor(lang)}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} />
      </button>
      {open && (
        <ul
          id="lang-menu"
          role="menu"
          className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-[10px] border border-border bg-surface shadow-feature"
        >
          {LANGS.map((l, i) => (
            <li key={l}>
              <button
                ref={(el) => { optionRefs.current[i] = el; }}
                type="button"
                onClick={() => selectLang(l)}
                onKeyDown={(e) => handleOptionKeyDown(e, i)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-[15px] hover:bg-bg focus:outline-none focus-visible:bg-bg ${
                  lang === l ? 'font-medium text-accent' : 'text-text-body'
                }`}
                role="menuitem"
                aria-current={lang === l ? 'true' : undefined}
              >
                <span>{labelFor(l)}</span>
                <span
                  aria-hidden="true"
                  className={`ml-auto flex size-4 items-center justify-center text-accent transition-opacity ${
                    lang === l ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.2} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
