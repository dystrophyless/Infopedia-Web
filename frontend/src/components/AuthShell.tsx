import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Globe02Icon,
  Mail01Icon,
  Tick02Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { useLangStore, type Language } from '../stores/langStore';
import { Button, Divider, FormField, Input, PasswordField, Text } from '../ui';

type MobileFieldLayout = 'default' | 'figma-auth';
type DesktopVisual = 'default' | 'onboarding';

export function AuthShell({
  title,
  children,
  footer,
  mobileHeaderMode = 'compact',
  mobileProgress,
  desktopFlowStep,
  desktopLayout = 'default',
  desktopContentWidth = 'full',
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  mobileHeaderMode?: 'compact' | 'status-aware';
  mobileProgress?: { step: 1 | 2 | 3; completedSegments: 0 | 1 | 2 | 3 };
  desktopFlowStep?: 1 | 2 | 3;
  desktopLayout?: 'default' | 'centered-card';
  desktopContentWidth?: 'full' | 'narrow';
}) {
  const desktopOnboarding = desktopFlowStep !== undefined;
  const desktopCentered = desktopLayout === 'centered-card';

  return (
    <div
      data-testid={desktopOnboarding ? 'desktop-onboarding-shell' : undefined}
      className={`flex min-h-screen w-full flex-col bg-bg max-lg:mx-auto max-lg:min-h-[932px] max-lg:max-w-[430px] max-lg:bg-[#efebf6] ${
        desktopOnboarding ? 'min-[1440px]:flex-row min-[1440px]:bg-[#efebf6]' : ''
      } ${desktopCentered ? 'min-[1440px]:relative min-[1440px]:bg-[#efebf6]' : ''}`}
    >
      {desktopOnboarding && <DesktopOnboardingSidebar currentStep={desktopFlowStep} />}
      <header
        className={`w-full items-center justify-between px-[60px] py-6 ${
          desktopOnboarding ? 'hidden lg:flex min-[1440px]:hidden' : 'flex max-lg:hidden'
        } ${desktopCentered ? 'min-[1440px]:absolute min-[1440px]:left-0 min-[1440px]:top-0 min-[1440px]:z-10' : ''}`}
      >
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Infopedia" className="h-[40px] w-auto" />
        </Link>
      </header>

      <header className="relative flex w-full justify-center px-8 lg:hidden">
        <span
          aria-hidden="true"
          className={mobileHeaderMode === 'status-aware' ? 'h-[112px]' : 'h-16'}
        />
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

      <div
        data-testid={desktopOnboarding ? 'desktop-onboarding-main' : desktopCentered ? 'desktop-auth-main' : undefined}
        className={`flex flex-1 items-center justify-center px-4 pb-12 max-lg:items-start max-lg:px-8 max-lg:pb-8 max-lg:px-8 ${
          mobileProgress ? 'max-lg:pt-[17px]' : 'max-lg:pt-[65px]'
        } ${
          desktopOnboarding
            ? 'min-[1440px]:min-h-screen min-[1440px]:w-[960px] min-[1440px]:flex-none min-[1440px]:bg-[#efebf6] min-[1440px]:p-12'
            : ''
        } ${
          desktopCentered
            ? 'min-[1440px]:min-h-screen min-[1440px]:w-full min-[1440px]:bg-[#efebf6] min-[1440px]:p-12'
            : ''
        }`}
      >
        <div
          data-testid={desktopOnboarding ? 'desktop-onboarding-card' : desktopCentered ? 'desktop-auth-card' : undefined}
          className={`w-full max-w-[520px] p-10 max-lg:w-full max-lg:max-w-[366px] max-lg:p-0 max-md:max-w-[366px] ${
            desktopOnboarding || desktopCentered
              ? 'min-[1440px]:w-[480px] min-[1440px]:max-w-none min-[1440px]:rounded-[16px] min-[1440px]:bg-white min-[1440px]:p-12'
              : ''
          } ${
            desktopFlowStep === 1
              ? 'min-[1440px]:h-[408px]'
              : desktopFlowStep === 2
                ? 'min-[1440px]:h-[308px]'
                : desktopFlowStep === 3
                  ? 'min-[1440px]:h-[508px]'
                  : ''
          }`}
        >
          <div className={desktopContentWidth === 'narrow' ? 'min-[1440px]:w-[366px]' : undefined}>
            {mobileProgress && (
              <div data-testid="mobile-onboarding-progress" className="mb-[29px] max-lg:block lg:hidden">
                <div className="flex h-[8px] w-[366px] max-w-full gap-[4px]" aria-hidden="true">
                  {[0, 1, 2].map((segment) => (
                    <span
                      key={segment}
                      className={`h-[8px] flex-1 rounded-[4px] ${
                        segment < mobileProgress.completedSegments ? 'bg-[#6a37c3]' : 'bg-[#ded2f1]'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[14px] leading-[17px] text-[#8c8698]">Шаг {mobileProgress.step} из 3</p>
              </div>
            )}
            <h1
              className={`mb-3 text-left text-[26px] font-medium leading-none text-text max-lg:mb-3 max-lg:text-[24px] max-lg:leading-none max-lg:text-[#161519] ${
                desktopOnboarding
                  ? 'min-[1440px]:mb-4 min-[1440px]:text-[24px] min-[1440px]:leading-none min-[1440px]:text-[#161519]'
                  : ''
              }`}
            >
              {title}
            </h1>
            {children}
            {footer && (
              <div
                className={`mt-4 text-center text-[14px] text-muted max-lg:mt-6 max-lg:text-[#c5b1e7] ${
                  desktopOnboarding
                    ? 'min-[1440px]:mt-6 min-[1440px]:text-[12px] min-[1440px]:text-[#a585db]'
                    : ''
                }`}
              >
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopOnboardingSidebar({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const steps = [
    {
      title: t('onboarding.desktopGradeStepTitle'),
      description: t('onboarding.desktopGradeStepDescription'),
    },
    {
      title: t('onboarding.desktopUsernameStepTitle'),
      description: t('onboarding.desktopUsernameStepDescription'),
    },
    {
      title: t('onboarding.desktopRegistrationStepTitle'),
      description: t('onboarding.desktopRegistrationStepDescription'),
    },
  ];

  return (
    <aside
      data-testid="desktop-onboarding-sidebar"
      className="hidden bg-white min-[1440px]:flex min-[1440px]:min-h-screen min-[1440px]:w-[480px] min-[1440px]:flex-none min-[1440px]:flex-col min-[1440px]:border-r min-[1440px]:border-[#ded2f1] min-[1440px]:px-16 min-[1440px]:py-8"
    >
      <Link to="/" className="block w-fit">
        <img
          data-testid="desktop-onboarding-logo"
          src="/logo.svg"
          alt="Infopedia"
          className="min-[1440px]:h-[44px] min-[1440px]:w-[171px]"
        />
      </Link>
      <div
        data-testid="desktop-onboarding-stepper"
        className="relative mt-20 flex w-[352px] flex-col gap-16"
      >
        <span
          aria-hidden="true"
          className="absolute bottom-6 left-[23px] top-6 w-[2px] bg-[#f8f5fc]"
        />
        {steps.map((step, index) => {
          const stepNumber = (index + 1) as 1 | 2 | 3;
          const completed = stepNumber < currentStep;
          const current = stepNumber === currentStep;

          return (
            <div
              key={stepNumber}
              data-step-state={completed ? 'completed' : current ? 'current' : 'future'}
              className="relative flex w-full items-center gap-6"
            >
              <span
                className={`relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full ${
                  current ? 'bg-[#efeaf8] text-[#6a37c3]' : 'bg-[#f8f5fc] text-[#c5b1e7]'
                }`}
              >
                {completed ? (
                  <HugeiconsIcon icon={Tick02Icon} size={24} strokeWidth={1.8} />
                ) : (
                  <span className="text-[24px] font-medium leading-none">{stepNumber}</span>
                )}
              </span>
              <span className="flex flex-col gap-2 font-medium leading-none">
                <span className={`text-[20px] ${current ? 'text-[#161519]' : 'text-[#6e6779]'}`}>
                  {step.title}
                </span>
                <span className={`text-[16px] ${current ? 'text-[#6e6779]' : 'text-[#b1acb9]'}`}>
                  {step.description}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </aside>
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
  desktopVisual = 'default',
}: {
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  mobileVisual?: 'default' | 'figma-auth';
  mobileTopClassName?: string;
  desktopVisual?: DesktopVisual;
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
      } ${
        desktopVisual === 'onboarding'
          ? unavailable
            ? 'min-[1440px]:mt-6 min-[1440px]:h-12 min-[1440px]:rounded-[8px] min-[1440px]:bg-[#efeaf8] min-[1440px]:p-0 min-[1440px]:font-medium min-[1440px]:text-[#c5b1e7] min-[1440px]:hover:opacity-100 min-[1440px]:disabled:opacity-100'
            : 'min-[1440px]:mt-6 min-[1440px]:h-12 min-[1440px]:rounded-[8px] min-[1440px]:bg-[#6a37c3] min-[1440px]:p-0 min-[1440px]:font-medium min-[1440px]:text-white'
          : ''
      }`}
    >
      {children}
    </Button>
  );
}

export function AuthDivider({
  label,
  mobileClassName = 'max-lg:my-6',
  desktopVisual = 'default',
}: {
  label: string;
  mobileClassName?: string;
  desktopVisual?: DesktopVisual;
}) {
  return (
    <div
      className={`my-5 flex items-center gap-3 text-[13px] text-muted max-lg:text-[14px] max-lg:text-[#c5b1e7] ${mobileClassName} ${
        desktopVisual === 'onboarding' ? 'min-[1440px]:my-6 min-[1440px]:text-[#c5b1e7]' : ''
      }`}
    >
      <Divider
        className={`h-px flex-1 border-0 bg-border max-lg:bg-[#c5b1e7] ${
          desktopVisual === 'onboarding' ? 'min-[1440px]:bg-[#c5b1e7]' : ''
        }`}
      />
      <Text as="span" tone="inherit" size="caption">
        {label}
      </Text>
      <Divider
        className={`h-px flex-1 border-0 bg-border max-lg:bg-[#c5b1e7] ${
          desktopVisual === 'onboarding' ? 'min-[1440px]:bg-[#c5b1e7]' : ''
        }`}
      />
    </div>
  );
}

export function GoogleAuthButton({
  children,
  onClick,
  desktopVisual = 'default',
}: {
  children: ReactNode;
  onClick: () => void;
  desktopVisual?: DesktopVisual;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="surface"
      size="lg"
      fullWidth
      className={`flex w-full items-center justify-center gap-3 rounded-[10px] border border-border bg-surface px-4 py-3 text-[16px] font-medium text-text transition-colors hover:border-accent hover:bg-bg max-lg:h-12 max-lg:rounded-[8px] max-lg:border-0 max-lg:bg-white max-lg:p-0 max-lg:text-[#161519] ${
        desktopVisual === 'onboarding'
          ? 'min-[1440px]:h-12 min-[1440px]:rounded-[8px] min-[1440px]:border-0 min-[1440px]:bg-[#f8f5fc] min-[1440px]:p-0 min-[1440px]:text-[#161519] min-[1440px]:hover:bg-[#f8f5fc]'
          : ''
      }`}
    >
      <img
        src="/figma/onboarding/google-black-icon.svg"
        aria-hidden="true"
        width={16}
        height={16}
        alt=""
      />
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
  desktopVisual = 'default',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  invalid?: boolean;
  hideMobileLeadingIconWhenFilled?: boolean;
  mobileFieldLayout?: MobileFieldLayout;
  desktopVisual?: DesktopVisual;
}) {
  const hideMobileLeadingIcon = hideMobileLeadingIconWhenFilled && value;

  return (
    <FormField
      error={error}
      className={`${mobileFieldLayout === 'figma-auth' ? 'mb-4 max-lg:mb-0 max-lg:gap-2' : 'mb-4'} ${
        desktopVisual === 'onboarding' ? 'min-[1440px]:mb-0' : ''
      }`}
    >
      {(controlProps) => (
        <span className="relative block">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted max-lg:size-4 max-lg:text-[#c5b1e7] ${
              hideMobileLeadingIcon ? 'max-lg:hidden' : ''
            } ${desktopVisual === 'onboarding' ? 'min-[1440px]:left-6 min-[1440px]:size-4 min-[1440px]:text-[#c5b1e7]' : ''}`}
          >
            <HugeiconsIcon icon={Mail01Icon} size={16} strokeWidth={1.7} />
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
            className={`auth-field w-full rounded-[10px] border py-3 pl-12 pr-4 text-[16px] text-text outline-none transition-colors placeholder:text-muted max-lg:h-12 max-lg:rounded-[8px] max-lg:border-0 max-lg:bg-white max-lg:py-0 max-lg:pr-12 max-lg:placeholder:text-[#c5b1e7] ${
              hideMobileLeadingIcon ? 'max-lg:pl-6' : 'max-lg:pl-[52px]'
            } ${
              error || invalid
                ? 'auth-field-error border-danger bg-[#fff5f5] focus:border-danger'
                : 'border-border bg-surface focus:border-accent'
            } ${
              desktopVisual === 'onboarding'
                ? error || invalid
                  ? 'min-[1440px]:h-12 min-[1440px]:rounded-[8px] min-[1440px]:border min-[1440px]:border-danger min-[1440px]:bg-[#fff5f5] min-[1440px]:py-0 min-[1440px]:pl-14 min-[1440px]:pr-6'
                  : 'min-[1440px]:h-12 min-[1440px]:rounded-[8px] min-[1440px]:border-0 min-[1440px]:bg-[#f8f5fc] min-[1440px]:py-0 min-[1440px]:pl-14 min-[1440px]:pr-6 min-[1440px]:placeholder:text-[#c5b1e7]'
                : ''
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
  desktopVisual = 'default',
  desktopShowSuccessIcon = false,
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
  desktopVisual?: DesktopVisual;
  desktopShowSuccessIcon?: boolean;
}) {
  const hideMobileLeadingIcon = hideMobileLeadingIconWhenFilled && value;

  return (
    <FormField
      error={error}
      helperText={helperText}
      helperTone={helperTone}
      messageClassName={!error && desktopShowSuccessIcon ? 'max-lg:hidden min-[1440px]:hidden' : undefined}
      className={`${mobileFieldLayout === 'figma-auth' ? 'mb-4 max-lg:mb-0 max-lg:gap-2' : 'mb-4'} ${
        desktopVisual === 'onboarding' ? 'min-[1440px]:mb-0' : ''
      }`}
    >
      {(controlProps) => (
        <span className="relative block">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted max-lg:size-4 max-lg:text-[#c5b1e7] ${
              hideMobileLeadingIcon ? 'max-lg:hidden' : ''
            } ${desktopVisual === 'onboarding' ? 'min-[1440px]:left-6 min-[1440px]:size-4 min-[1440px]:text-[#c5b1e7]' : ''}`}
          >
            <HugeiconsIcon icon={UserIcon} size={16} strokeWidth={1.7} />
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
            } ${
              desktopVisual === 'onboarding'
                ? error
                  ? 'min-[1440px]:h-12 min-[1440px]:rounded-[8px] min-[1440px]:border min-[1440px]:border-danger min-[1440px]:bg-[#fff5f5] min-[1440px]:py-0 min-[1440px]:pl-14 min-[1440px]:pr-10'
                  : 'min-[1440px]:h-12 min-[1440px]:rounded-[8px] min-[1440px]:border-0 min-[1440px]:bg-[#f8f5fc] min-[1440px]:py-0 min-[1440px]:pl-14 min-[1440px]:pr-10 min-[1440px]:placeholder:text-[#c5b1e7]'
                : ''
            }`}
          />
          {desktopShowSuccessIcon && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-[#19b978] min-[1440px]:right-6"
            >
              <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />
            </span>
          )}
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
  desktopVisual = 'default',
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
  desktopVisual?: DesktopVisual;
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
      className={`${mobileFieldLayout === 'figma-auth' ? 'mb-4 max-lg:mb-0 max-lg:gap-2' : 'mb-4'} ${
        desktopVisual === 'onboarding' ? 'min-[1440px]:mb-0' : ''
      }`}
      leadingIconClassName={`max-lg:size-4 max-lg:text-[#c5b1e7] ${
        hideMobileLeadingIcon ? 'max-lg:hidden' : ''
      } ${desktopVisual === 'onboarding' ? 'min-[1440px]:left-6 min-[1440px]:size-4 min-[1440px]:text-[#c5b1e7]' : ''}`}
      inputClassName={`auth-field w-full rounded-[10px] border py-3 pl-12 pr-12 text-[16px] text-text outline-none transition-colors placeholder:text-muted max-lg:h-12 max-lg:rounded-[8px] max-lg:border-0 max-lg:bg-white max-lg:py-0 max-lg:pr-12 max-lg:placeholder:text-[#c5b1e7] ${
        hideMobileLeadingIcon ? 'max-lg:pl-6' : 'max-lg:pl-[52px]'
      } ${
        error || invalid
          ? 'auth-field-error border-danger bg-[#fff5f5] focus:border-danger'
          : 'border-border bg-surface focus:border-accent'
      } ${
        desktopVisual === 'onboarding'
          ? error || invalid
            ? 'min-[1440px]:h-12 min-[1440px]:rounded-[8px] min-[1440px]:border min-[1440px]:border-danger min-[1440px]:bg-[#fff5f5] min-[1440px]:py-0 min-[1440px]:pl-14 min-[1440px]:pr-12'
            : 'min-[1440px]:h-12 min-[1440px]:rounded-[8px] min-[1440px]:border-0 min-[1440px]:bg-[#f8f5fc] min-[1440px]:py-0 min-[1440px]:pl-14 min-[1440px]:pr-12 min-[1440px]:placeholder:text-[#c5b1e7]'
          : ''
      }`}
      toggleClassName={`right-3 flex size-8 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-bg hover:text-accent max-lg:right-2 max-lg:text-[#8c8698] ${
        desktopVisual === 'onboarding'
          ? 'min-[1440px]:right-4 min-[1440px]:text-[#c5b1e7] min-[1440px]:hover:bg-transparent'
          : ''
      }`}
    />
  );
}
