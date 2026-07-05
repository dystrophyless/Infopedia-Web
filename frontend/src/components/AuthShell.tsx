import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Globe02Icon,
  LockPasswordIcon,
  Mail01Icon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { useLangStore, type Language } from '../stores/langStore';

export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-bg flex flex-col max-lg:mx-auto max-lg:min-h-[932px] max-lg:max-w-[430px] max-lg:bg-[#efebf6]">
      <header className="w-full px-[60px] max-lg:hidden py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Infopedia" className="h-[40px] w-auto" />
        </Link>
      </header>

      <header className="relative flex h-[112px] w-full justify-center px-8 lg:hidden">
        <AuthMobileStatusBar />
        <Link to="/" className="absolute top-16 left-1/2 -translate-x-1/2">
          <img src="/logo.svg" alt="Infopedia" className="h-8 w-auto" />
        </Link>
        <div className="absolute right-8 top-16">
          <AuthMobileLanguageToggle />
        </div>
        <div className="absolute bottom-0 left-0 h-px w-full bg-[#eae9ec]" />
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-12 max-lg:items-start max-lg:px-8 max-lg:pb-8 max-lg:pt-[65px] max-md:px-8">
        <div className="w-full max-w-[440px] bg-surface border border-border rounded-[15px] shadow-feature p-10 max-lg:w-full max-lg:max-w-[366px] max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none max-md:max-w-[366px] max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none">
          <h1 className="mb-3 text-left text-[26px] font-medium text-text max-lg:mb-3 max-lg:text-[24px] max-lg:leading-[normal] max-lg:text-[#161519]">{title}</h1>
          {children}
          {footer && (
            <div className="mt-4 text-center text-[14px] text-muted max-lg:mt-6 max-lg:text-[#c5b1e7]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthMobileStatusBar() {
  return (
    <div className="absolute left-0 top-0 h-12 w-full text-[#161519]" aria-hidden="true">
      <span className="absolute left-[57px] top-[25px] text-[16px] font-medium leading-none">
        20:31
      </span>
      <div className="absolute right-[43px] top-[22px] flex h-4 items-center gap-[6px]">
        <span className="flex h-[12px] w-[18px] items-end gap-[2px]">
          <span className="h-[4px] w-[3px] rounded-sm bg-[#161519]" />
          <span className="h-[6px] w-[3px] rounded-sm bg-[#161519]" />
          <span className="h-[8px] w-[3px] rounded-sm bg-[#161519]" />
          <span className="h-[10px] w-[3px] rounded-sm bg-[#161519]" />
        </span>
        <span className="relative h-[12px] w-[16px]">
          <span className="absolute bottom-0 left-0 h-[4px] w-[16px] rounded-t-full border-t-2 border-[#161519]" />
          <span className="absolute bottom-[3px] left-[3px] h-[5px] w-[10px] rounded-t-full border-t-2 border-[#161519]" />
          <span className="absolute bottom-[6px] left-[6px] h-[4px] w-[4px] rounded-t-full border-t-2 border-[#161519]" />
        </span>
        <span className="relative h-[12px] w-[24px] rounded-[4px] border-2 border-[#161519]">
          <span className="absolute -right-[4px] top-[3px] h-[4px] w-[2px] rounded-r-sm bg-[#161519]" />
          <span className="absolute left-[2px] top-[2px] h-[4px] w-[16px] rounded-sm bg-[#161519]" />
        </span>
      </div>
    </div>
  );
}

function AuthMobileLanguageToggle() {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const nextLang: Language = lang === 'ru' ? 'kk' : 'ru';

  return (
    <button
      type="button"
      aria-label={t('common.language')}
      className="flex h-8 items-center justify-center gap-[5px] px-5 text-[12px] font-normal leading-none text-[#b1acb9]"
      onClick={() => setLang(nextLang)}
    >
      <span>{lang.toUpperCase()}</span>
      <HugeiconsIcon icon={Globe02Icon} size={14} strokeWidth={1.8} />
    </button>
  );
}

export function AuthInput({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required = true,
  error,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="mb-4 flex flex-col gap-1.5 text-[14px] font-medium text-text-body">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className={`border ${
          error
            ? 'auth-field-error border-danger bg-[#fff5f5] focus:border-danger'
            : 'border-border bg-surface focus:border-accent'
        } rounded-[10px] px-4 py-3 text-[16px] text-text outline-none transition-colors`}
      />
      {error && <span className="text-danger text-[13px]">{error}</span>}
    </label>
  );
}

export function AuthSubmit({
  loading,
  disabled,
  children,
}: {
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full bg-primary text-surface rounded-[10px] py-3 text-[16px] mt-2 hover:opacity-90 transition-opacity disabled:opacity-60 max-lg:h-12 max-lg:mt-8 max-lg:rounded-[8px] max-lg:bg-[#44237d] max-lg:p-0 max-lg:font-medium max-lg:text-white"
    >
      {children}
    </button>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-[13px] text-muted max-lg:my-6 max-lg:text-[14px] max-lg:text-[#c5b1e7]">
      <span className="h-px flex-1 bg-border max-lg:bg-[#c5b1e7]" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-border max-lg:bg-[#c5b1e7]" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 text-accent"
      fill="currentColor"
    >
      <path d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.32 2.98-7.53Z" />
      <path d="M12 22c2.7 0 4.97-.9 6.62-2.44l-3.24-2.52c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.6-4.12H3.05v2.6A10 10 0 0 0 12 22Z" />
      <path d="M6.4 13.88a6 6 0 0 1 0-3.76v-2.6H3.05a10 10 0 0 0 0 8.96l3.35-2.6Z" />
      <path d="M12 6c1.47 0 2.78.5 3.82 1.5l2.87-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.52l3.35 2.6C7.2 7.76 9.4 6 12 6Z" />
    </svg>
  );
}

export function GoogleAuthButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-[10px] border border-border bg-surface px-4 py-3 text-[16px] font-medium text-text transition-colors hover:border-accent hover:bg-bg max-lg:h-12 max-lg:rounded-[8px] max-lg:border-0 max-lg:bg-white max-lg:p-0 max-lg:text-[#161519]"
    >
      <GoogleIcon />
      <span>{children}</span>
    </button>
  );
}

export function AuthEmailInput({
  label,
  value,
  onChange,
  error,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  invalid?: boolean;
}) {
  return (
    <label className="mb-4 flex flex-col gap-1.5">
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted max-lg:size-4 max-lg:text-[#c5b1e7]">
          <HugeiconsIcon icon={Mail01Icon} size={18} strokeWidth={1.7} />
        </span>
        <input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="email"
          placeholder={label}
          aria-label={label}
          required
          className={`auth-field w-full rounded-[10px] border py-3 pl-12 pr-4 text-[16px] text-text outline-none transition-colors placeholder:text-muted max-lg:h-12 max-lg:rounded-[8px] max-lg:border-0 max-lg:bg-white max-lg:py-0 max-lg:pl-[52px] max-lg:placeholder:text-[#c5b1e7] ${
            error || invalid
              ? 'auth-field-error border-danger bg-[#fff5f5] focus:border-danger'
              : 'border-border bg-surface focus:border-accent'
          }`}
        />
      </span>
      {error && <span className="text-danger text-[13px] font-normal">{error}</span>}
    </label>
  );
}

export function AuthUsernameInput({
  label,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  helperTone = 'muted',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  helperTone?: 'muted' | 'success';
}) {
  return (
    <label className="mb-4 flex flex-col gap-1.5">
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted max-lg:size-4 max-lg:text-[#c5b1e7]">
          <HugeiconsIcon icon={UserIcon} size={18} strokeWidth={1.7} />
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete="username"
          placeholder={label}
          aria-label={label}
          required
          className={`auth-field w-full rounded-[10px] border py-3 pl-12 pr-4 text-[16px] text-text outline-none transition-colors placeholder:text-muted max-lg:h-12 max-lg:rounded-[8px] max-lg:border-0 max-lg:bg-white max-lg:py-0 max-lg:pl-[52px] max-lg:placeholder:text-[#c5b1e7] ${
            error
              ? 'auth-field-error border-danger bg-[#fff5f5] focus:border-danger'
              : 'border-border bg-surface focus:border-accent'
          }`}
        />
      </span>
      {error && <span className="text-danger text-[13px] font-normal">{error}</span>}
      {!error && helperText && (
        <span
          className={`text-[13px] font-normal ${
            helperTone === 'success' ? 'text-success' : 'text-muted'
          }`}
        >
          {helperText}
        </span>
      )}
    </label>
  );
}

export function AuthPasswordInput({
  label,
  value,
  visible,
  onChange,
  onToggle,
  toggleLabel,
  error,
  invalid,
  autoComplete = 'current-password',
}: {
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  toggleLabel: string;
  error?: string;
  invalid?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="mb-4 flex flex-col gap-1.5">
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted max-lg:size-4 max-lg:text-[#c5b1e7]">
          <HugeiconsIcon icon={LockPasswordIcon} size={18} strokeWidth={1.7} />
        </span>
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={label}
          aria-label={label}
          required
          className={`auth-field w-full rounded-[10px] border py-3 pl-12 pr-12 text-[16px] text-text outline-none transition-colors placeholder:text-muted max-lg:h-12 max-lg:rounded-[8px] max-lg:border-0 max-lg:bg-white max-lg:py-0 max-lg:pl-[52px] max-lg:pr-12 max-lg:placeholder:text-[#c5b1e7] ${
            error || invalid
              ? 'auth-field-error border-danger bg-[#fff5f5] focus:border-danger'
              : 'border-border bg-surface focus:border-accent'
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-bg hover:text-accent max-lg:right-2 max-lg:text-[#8c8698]"
        >
          <HugeiconsIcon icon={visible ? ViewOffIcon : ViewIcon} size={18} strokeWidth={1.7} />
        </button>
      </span>
      {error && <span className="text-danger text-[13px] font-normal">{error}</span>}
    </label>
  );
}
