import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Globe02Icon,
  Mail01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { useLangStore, type Language } from '../stores/langStore';
import { Button, Divider, FormField, Input, PasswordField, Text } from '../ui';

type MobileFieldLayout = 'default' | 'figma-auth';

export function AuthShell({
  title,
  children,
  footer,
  mobileHeaderMode = 'compact',
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  mobileHeaderMode?: 'compact' | 'status-aware';
}) {
  return (
    <div className="min-h-screen w-full bg-bg flex flex-col max-lg:mx-auto max-lg:min-h-[932px] max-lg:max-w-[430px] max-lg:bg-[#efebf6]">
      <header className="w-full px-[60px] max-lg:hidden py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Infopedia" className="h-[40px] w-auto" />
        </Link>
      </header>

      <header
        className={`relative flex w-full justify-center px-8 lg:hidden ${
          mobileHeaderMode === 'status-aware' ? 'h-[112px]' : 'h-16'
        }`}
      >
        <Link
          to="/"
          className={`absolute left-1/2 -translate-x-1/2 ${
            mobileHeaderMode === 'status-aware' ? 'top-16' : 'top-4'
          }`}
        >
          <img src="/logo.svg" alt="Infopedia" className="h-8 w-auto" />
        </Link>
        <div
          className={`absolute right-8 ${
            mobileHeaderMode === 'status-aware' ? 'top-16' : 'top-4'
          }`}
        >
          <AuthMobileLanguageToggle />
        </div>
        <div className="absolute bottom-0 left-0 h-px w-full bg-[#eae9ec]" />
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-12 max-lg:items-start max-lg:px-8 max-lg:pb-8 max-lg:pt-[65px] max-md:px-8">
        <div className="w-full max-w-[520px] p-10 max-lg:w-full max-lg:max-w-[366px] max-lg:p-0 max-md:max-w-[366px]">
          <h1 className="mb-3 text-left text-[26px] font-medium leading-none text-text max-lg:mb-3 max-lg:text-[24px] max-lg:leading-none max-lg:text-[#161519]">{title}</h1>
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

function AuthMobileLanguageToggle() {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const nextLang: Language = lang === 'ru' ? 'kk' : 'ru';

  return (
    <button
      type="button"
      aria-label={t('common.language')}
      className="flex h-8 items-center justify-center gap-[5px] px-5 text-[12px] font-normal leading-none text-[#8c8698]"
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
    <FormField label={label} error={error} className="mb-4">
      {(controlProps) => (
        <Input
          {...controlProps}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          invalid={Boolean(error)}
          className={`rounded-[10px] border px-4 py-3 text-[16px] text-text outline-none transition-colors ${
            error
              ? 'auth-field-error border-danger bg-[#fff5f5] focus:border-danger'
              : 'auth-field border-border bg-surface focus:border-accent'
          }`}
        />
      )}
    </FormField>
  );
}

export function AuthSubmit({
  loading,
  disabled,
  children,
  mobileVisual = 'default',
  mobileTopClassName = 'max-lg:mt-6',
}: {
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  mobileVisual?: 'default' | 'figma-auth';
  mobileTopClassName?: string;
}) {
  const unavailable = Boolean(loading || disabled);

  return (
    <Button
      type="submit"
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      fullWidth
      size="lg"
      className={`w-full rounded-[10px] bg-primary py-3 text-[16px] text-surface transition-opacity hover:opacity-90 disabled:opacity-60 ${
        mobileVisual === 'figma-auth'
          ? unavailable
            ? `${mobileTopClassName} max-lg:h-12 max-lg:rounded-[8px] max-lg:bg-[#ded2f1] max-lg:p-0 max-lg:font-medium max-lg:text-[#a585db] max-lg:disabled:opacity-100`
            : `${mobileTopClassName} max-lg:h-12 max-lg:rounded-[8px] max-lg:bg-[#6a37c3] max-lg:p-0 max-lg:font-medium max-lg:text-white`
          : 'mt-2 max-lg:mt-6 max-lg:h-12 max-lg:rounded-[8px] max-lg:bg-[#44237d] max-lg:p-0 max-lg:font-medium max-lg:text-white'
      }`}
    >
      {children}
    </Button>
  );
}

export function AuthDivider({
  label,
  mobileClassName = 'max-lg:my-6',
}: {
  label: string;
  mobileClassName?: string;
}) {
  return (
    <div
      className={`my-5 flex items-center gap-3 text-[13px] text-muted max-lg:text-[14px] max-lg:text-[#c5b1e7] ${mobileClassName}`}
    >
      <Divider className="h-px flex-1 border-0 bg-border max-lg:bg-[#c5b1e7]" />
      <Text as="span" tone="inherit" size="caption">
        {label}
      </Text>
      <Divider className="h-px flex-1 border-0 bg-border max-lg:bg-[#c5b1e7]" />
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
    <Button
      type="button"
      onClick={onClick}
      variant="surface"
      size="lg"
      fullWidth
      className="flex w-full items-center justify-center gap-3 rounded-[10px] border border-border bg-surface px-4 py-3 text-[16px] font-medium text-text transition-colors hover:border-accent hover:bg-bg max-lg:h-12 max-lg:rounded-[8px] max-lg:border-0 max-lg:bg-white max-lg:p-0 max-lg:text-[#161519]"
    >
      <GoogleIcon />
      <span>{children}</span>
    </Button>
  );
}

export function AuthEmailInput({
  label,
  value,
  onChange,
  error,
  invalid,
  hideMobileLeadingIconWhenFilled = false,
  mobileFieldLayout = 'default',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  invalid?: boolean;
  hideMobileLeadingIconWhenFilled?: boolean;
  mobileFieldLayout?: MobileFieldLayout;
}) {
  const hideMobileLeadingIcon = hideMobileLeadingIconWhenFilled && value;

  return (
    <FormField
      error={error}
      className={mobileFieldLayout === 'figma-auth' ? 'mb-4 max-lg:mb-0 max-lg:gap-2' : 'mb-4'}
    >
      {(controlProps) => (
        <span className="relative block">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted max-lg:size-4 max-lg:text-[#c5b1e7] ${
              hideMobileLeadingIcon ? 'max-lg:hidden' : ''
            }`}
          >
            <HugeiconsIcon icon={Mail01Icon} size={18} strokeWidth={1.7} />
          </span>
          <Input
            {...controlProps}
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="email"
            placeholder={label}
            aria-label={label}
            required
            invalid={Boolean(error || invalid)}
            className={`auth-field w-full rounded-[10px] border py-3 pl-12 pr-4 text-[16px] text-text outline-none transition-colors placeholder:text-muted max-lg:h-12 max-lg:rounded-[8px] max-lg:border-0 max-lg:bg-white max-lg:py-0 max-lg:placeholder:text-[#c5b1e7] ${
              hideMobileLeadingIcon ? 'max-lg:pl-6' : 'max-lg:pl-[52px]'
            } ${
              error || invalid
                ? 'auth-field-error border-danger bg-[#fff5f5] focus:border-danger'
                : 'border-border bg-surface focus:border-accent'
            }`}
          />
        </span>
      )}
    </FormField>
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
  hideMobileLeadingIconWhenFilled = false,
  mobileFieldLayout = 'default',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  helperTone?: 'muted' | 'success';
  hideMobileLeadingIconWhenFilled?: boolean;
  mobileFieldLayout?: MobileFieldLayout;
}) {
  const hideMobileLeadingIcon = hideMobileLeadingIconWhenFilled && value;

  return (
    <FormField
      error={error}
      helperText={helperText}
      helperTone={helperTone}
      className={mobileFieldLayout === 'figma-auth' ? 'mb-4 max-lg:mb-0 max-lg:gap-2' : 'mb-4'}
    >
      {(controlProps) => (
        <span className="relative block">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted max-lg:size-4 max-lg:text-[#c5b1e7] ${
              hideMobileLeadingIcon ? 'max-lg:hidden' : ''
            }`}
          >
            <HugeiconsIcon icon={UserIcon} size={18} strokeWidth={1.7} />
          </span>
          <Input
            {...controlProps}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            autoComplete="username"
            placeholder={label}
            aria-label={label}
            required
            invalid={Boolean(error)}
            className={`auth-field w-full rounded-[10px] border py-3 pl-12 pr-4 text-[16px] text-text outline-none transition-colors placeholder:text-muted max-lg:h-12 max-lg:rounded-[8px] max-lg:border-0 max-lg:bg-white max-lg:py-0 max-lg:placeholder:text-[#c5b1e7] ${
              hideMobileLeadingIcon ? 'max-lg:pl-6' : 'max-lg:pl-[52px]'
            } ${
              error
                ? 'auth-field-error border-danger bg-[#fff5f5] focus:border-danger'
                : 'border-border bg-surface focus:border-accent'
            }`}
          />
        </span>
      )}
    </FormField>
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
  hideMobileLeadingIconWhenFilled = false,
  mobileFieldLayout = 'default',
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
  hideMobileLeadingIconWhenFilled?: boolean;
  mobileFieldLayout?: MobileFieldLayout;
}) {
  const hideMobileLeadingIcon = hideMobileLeadingIconWhenFilled && value;

  return (
    <PasswordField
      label={label}
      value={value}
      visible={visible}
      onChange={onChange}
      onToggle={onToggle}
      toggleLabel={toggleLabel}
      error={error}
      invalid={invalid}
      autoComplete={autoComplete}
      className={mobileFieldLayout === 'figma-auth' ? 'mb-4 max-lg:mb-0 max-lg:gap-2' : 'mb-4'}
      leadingIconClassName={`max-lg:size-4 max-lg:text-[#c5b1e7] ${
        hideMobileLeadingIcon ? 'max-lg:hidden' : ''
      }`}
      inputClassName={`auth-field w-full rounded-[10px] border py-3 pl-12 pr-12 text-[16px] text-text outline-none transition-colors placeholder:text-muted max-lg:h-12 max-lg:rounded-[8px] max-lg:border-0 max-lg:bg-white max-lg:py-0 max-lg:pr-12 max-lg:placeholder:text-[#c5b1e7] ${
        hideMobileLeadingIcon ? 'max-lg:pl-6' : 'max-lg:pl-[52px]'
      } ${
        error || invalid
          ? 'auth-field-error border-danger bg-[#fff5f5] focus:border-danger'
          : 'border-border bg-surface focus:border-accent'
      }`}
      toggleClassName="right-3 flex size-8 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-bg hover:text-accent max-lg:right-2 max-lg:text-[#8c8698]"
    />
  );
}
