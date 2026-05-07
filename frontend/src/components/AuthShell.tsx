import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
          <h1 className="font-medium text-[28px] text-text mb-6 text-center">{title}</h1>
          {children}
          {footer && <div className="mt-6 text-center text-[14px] text-muted">{footer}</div>}
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
    <label className="flex flex-col gap-1.5 mb-4 text-[14px] text-text-body">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className={`bg-surface border ${
          error ? 'border-danger' : 'border-border'
        } rounded-[10px] px-4 py-3 text-[16px] text-text outline-none focus:border-accent transition-colors`}
      />
      {error && <span className="text-danger text-[13px]">{error}</span>}
    </label>
  );
}

export function AuthSubmit({
  loading,
  children,
}: {
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-primary text-surface rounded-[10px] py-3 text-[16px] mt-2 hover:opacity-90 transition-opacity disabled:opacity-60"
    >
      {children}
    </button>
  );
}
