import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  LockPasswordIcon,
  Mail01Icon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { LanguageSwitcher } from './LanguageSwitcher';

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
    <div className="min-h-screen w-full bg-bg flex flex-col">
      <header className="w-full px-[60px] max-md:px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Infopedia" className="h-[40px] w-auto" />
        </Link>
        <LanguageSwitcher />
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-[440px] bg-surface border border-border rounded-[15px] shadow-feature p-10">
          <h1 className="mb-3 text-left text-[26px] font-medium text-text">{title}</h1>
          {children}
          {footer && <div className="mt-4 text-center text-[14px] text-muted">{footer}</div>}
        </div>
      </div>
    </div>
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
      className="w-full bg-primary text-surface rounded-[10px] py-3 text-[16px] mt-2 hover:opacity-90 transition-opacity disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function AuthEmailInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="mb-4 flex flex-col gap-1.5">
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted">
          <HugeiconsIcon icon={Mail01Icon} size={20} strokeWidth={1.7} />
        </span>
        <input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="email"
          placeholder={label}
          aria-label={label}
          required
          className={`auth-field w-full rounded-[10px] border py-3 pl-12 pr-4 text-[16px] text-text outline-none transition-colors placeholder:text-muted ${
            error
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
        <span className="pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted">
          <HugeiconsIcon icon={UserIcon} size={20} strokeWidth={1.7} />
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
          className={`auth-field w-full rounded-[10px] border py-3 pl-12 pr-4 text-[16px] text-text outline-none transition-colors placeholder:text-muted ${
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
  autoComplete = 'current-password',
}: {
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  toggleLabel: string;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <label className="mb-4 flex flex-col gap-1.5">
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted">
          <HugeiconsIcon icon={LockPasswordIcon} size={20} strokeWidth={1.7} />
        </span>
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={label}
          aria-label={label}
          required
          className={`auth-field w-full rounded-[10px] border py-3 pl-12 pr-12 text-[16px] text-text outline-none transition-colors placeholder:text-muted ${
            error
              ? 'auth-field-error border-danger bg-[#fff5f5] focus:border-danger'
              : 'border-border bg-surface focus:border-accent'
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-bg hover:text-accent"
        >
          <HugeiconsIcon icon={visible ? ViewOffIcon : ViewIcon} size={20} strokeWidth={1.7} />
        </button>
      </span>
      {error && <span className="text-danger text-[13px] font-normal">{error}</span>}
    </label>
  );
}
