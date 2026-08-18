import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, InternetIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useLangStore, type Language } from '../stores/langStore';

const LANGS: Language[] = ['ru', 'kk'];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const keyboardOpenRef = useRef(false);
  const [keyboardModality, setKeyboardModality] = useState(false);

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
      keyboardOpenRef.current = true;
      setKeyboardModality(true);
      optionRefs.current[Math.min(index + 1, LANGS.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      keyboardOpenRef.current = true;
      setKeyboardModality(true);
      optionRefs.current[Math.max(index - 1, 0)]?.focus();
    } else if (e.key === 'Escape') {
      keyboardOpenRef.current = false;
      setKeyboardModality(false);
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  function selectLang(l: Language) {
    keyboardOpenRef.current = false;
    setKeyboardModality(false);
    setLang(l);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      keyboardOpenRef.current = true;
      setKeyboardModality(true);
    }
  }

  return (
    <div className={compact ? 'relative flex flex-col items-end gap-[16px]' : 'relative'} ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onPointerDown={() => { keyboardOpenRef.current = false; setKeyboardModality(false); }}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => setOpen((v) => !v)}
        className={compact
          ? 'flex h-[32px] shrink-0 items-center justify-center gap-[8px] whitespace-nowrap rounded-[8px] border-0 bg-white px-[12px] py-[8px] text-[12px] font-normal leading-[normal] text-[#b1acb9] hover:bg-[#f6f5f7] hover:text-[#161519] aria-expanded:bg-[#d5d3d9] aria-expanded:text-[#161519] aria-expanded:hover:bg-[#d5d3d9]'
          : 'flex items-center gap-[5px] px-2 py-2 text-[16px] leading-none text-muted transition-colors hover:text-accent'}
        aria-haspopup="menu"
        aria-controls="lang-menu"
        aria-expanded={open}
        aria-label={compact ? labelFor(lang) : undefined}
      >
        {compact ? (
          <>
            <HugeiconsIcon icon={InternetIcon} size={16} strokeWidth={1.5} className="shrink-0" aria-hidden />
            <span>{lang.toUpperCase()}</span>
          </>
        ) : (
          <>
            <span>{labelFor(lang)}</span>
            <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} />
          </>
        )}
      </button>
      {open && (
        <ul
          id="lang-menu"
          role="menu"
          className={compact
            ? 'absolute right-0 top-full z-50 mt-[8px] flex w-[160px] flex-col overflow-hidden rounded-[8px] border border-[#eae9ec] bg-white p-[4px] shadow-none'
            : 'absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-[10px] border border-border bg-surface'}
        >
          {LANGS.map((l, i) => (
            <li key={l} role="none">
              <button
                ref={(el) => { optionRefs.current[i] = el; }}
                type="button"
                onClick={() => selectLang(l)}
                onKeyDown={(e) => handleOptionKeyDown(e, i)}
                className={compact
                  ? `flex h-[28px] w-full items-center justify-between rounded-[4px] px-[8px] py-[6px] text-left text-[14px] font-normal leading-[normal] text-[#161519] hover:bg-[#f8f5fc] focus:outline-none ${
                    keyboardModality
                      ? 'focus-visible:outline-2 focus-visible:outline-[#6a37c3] focus-visible:outline-offset-[-2px]'
                      : 'focus-visible:outline-none'
                  }`
                  : `flex w-full items-center gap-3 px-4 py-2 text-left text-[15px] leading-none hover:bg-bg focus:outline-none focus-visible:bg-bg ${
                    lang === l ? 'font-medium text-accent' : 'text-text-body'
                  }`}
                role="menuitem"
                aria-current={lang === l ? 'true' : undefined}
              >
                <span>{labelFor(l)}</span>
                {compact && lang === l ? <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={1.5} className="text-[#6a37c3]" /> : compact ? null : (
                  <span
                    aria-hidden="true"
                    className={`ml-auto flex size-4 items-center justify-center text-accent transition-opacity ${
                      lang === l ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.2} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
