import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Backpack02Icon,
  GraduationCapIcon,
  AnonymousIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { useAuthStore } from '../stores/authStore';
import { checkUsernameAvailability, setMyGrade, setMyUsername } from '../api/users';
import { AuthShell, AuthSubmit, AuthUsernameInput } from '../components/AuthShell';
import { Button, Text } from '../ui';
import {
  applyPendingOnboardingDraft,
  clearPendingOnboardingDraft,
  getOnboardingErrorCode,
  readPendingOnboardingDraft,
  savePendingOnboardingDraft,
} from '../utils/onboardingDraft';
import type { User, UserGrade } from '../types';
import { validateUsername } from '../features/users/model/usernameValidation';

type OnboardingStep = 'grade' | 'username';
type SelectableGrade = UserGrade;
type UsernameAvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

const gradeOptions: SelectableGrade[] = ['10', '11', 'undefined'];
const USERNAME_CHECK_DELAY_MS = 450;

function getErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err) && err.response?.data) {
    const detail = (err.response.data as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof detail.message === 'string'
    ) {
      return detail.message;
    }
  }
  return fallback;
}

function getInitialStep(user: User | null): OnboardingStep {
  if (user?.grade && !user.username) return 'username';
  if (!user && readPendingOnboardingDraft()) return 'username';
  return 'grade';
}

function getInitialGrade(user: User | null): SelectableGrade | null {
  return user?.grade ?? readPendingOnboardingDraft()?.grade ?? null;
}

function getInitialUsername(user: User | null): string {
  return user?.username ?? readPendingOnboardingDraft()?.username ?? '';
}

function getUsernameValidationError(
  username: string,
  t: (key: string) => string,
  { required }: { required: boolean },
) {
  const code = validateUsername(username, { required });
  if (code === 'required') return t('onboarding.usernameRequired');
  if (code === 'length') return t('onboarding.usernameLength');
  if (code === 'invalid') return t('onboarding.usernameInvalid');
  if (code === 'edge') return t('onboarding.usernameInvalidEdge');
  if (code === 'repeated') return t('onboarding.usernameInvalidRepeated');
  return null;
}

function isIgnorableSetupConflict(err: unknown, codes: string[]) {
  const code = getOnboardingErrorCode(err);
  return code !== null && codes.includes(code);
}

export function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token, user, setUser } = useAuthStore();
  const [step, setStep] = useState<OnboardingStep>(() => getInitialStep(user));
  const [username, setUsername] = useState(() => getInitialUsername(user));
  const [usernameAvailability, setUsernameAvailability] =
    useState<UsernameAvailabilityStatus>('idle');
  const [checkedUsername, setCheckedUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [grade, setGrade] = useState<SelectableGrade | null>(() => getInitialGrade(user));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyingDraft, setApplyingDraft] = useState(false);
  const normalizedUsername = username.trim();
  const usernameFormatError = getUsernameValidationError(normalizedUsername, t, {
    required: false,
  });
  const usernameTakenError =
    usernameAvailability === 'taken' && checkedUsername === normalizedUsername
      ? t('onboarding.usernameTaken')
      : null;
  const shouldShowUsernameValidation = usernameTouched || Boolean(error);
  const usernameFieldError =
    error ?? (shouldShowUsernameValidation ? usernameFormatError : null) ?? usernameTakenError;
  const usernameHelperText =
    !usernameFieldError && usernameAvailability === 'checking'
      ? t('onboarding.usernameChecking')
      : !usernameFieldError &&
          usernameAvailability === 'available' &&
          checkedUsername === normalizedUsername
        ? t('onboarding.usernameAvailable')
        : !usernameFieldError &&
            usernameAvailability === 'error' &&
            checkedUsername === normalizedUsername
          ? t('onboarding.usernameCheckFailed')
          : undefined;
  const usernameHelperTone =
    usernameAvailability === 'available' && checkedUsername === normalizedUsername
      ? 'success'
      : 'muted';
  const usernameCanSubmit =
    Boolean(normalizedUsername) &&
    !usernameFormatError &&
    usernameAvailability === 'available' &&
    checkedUsername === normalizedUsername;

  useEffect(() => {
    if (user?.grade) setGrade(user.grade);
    if (user?.username) setUsername(user.username);
  }, [user?.grade, user?.username]);

  useEffect(() => {
    if (user?.onboarding_completed === true) {
      clearPendingOnboardingDraft();
    }
  }, [user?.onboarding_completed]);

  useEffect(() => {
    if (!token || user?.onboarding_completed === true) return;

    const draft = readPendingOnboardingDraft();
    if (!draft) return;

    let cancelled = false;
    setApplyingDraft(true);
    setError(null);
    setGrade(draft.grade);
    setUsername(draft.username);

    void applyPendingOnboardingDraft()
      .then((nextUser) => {
        if (cancelled) return;
        if (nextUser) setUser(nextUser);
        navigate('/profile', { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        setApplyingDraft(false);
        setStep('username');
        setError(getErrorMessage(err, t('onboarding.usernameFailed')));
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, setUser, t, token, user?.onboarding_completed]);

  useEffect(() => {
    setUsernameAvailability('idle');
    setCheckedUsername('');

    if (step !== 'username' || !normalizedUsername || usernameFormatError) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setUsernameAvailability('checking');
      setCheckedUsername(normalizedUsername);

      void checkUsernameAvailability(normalizedUsername)
        .then((result) => {
          if (cancelled) return;
          setCheckedUsername(result.username);
          setUsernameAvailability(result.available ? 'available' : 'taken');
        })
        .catch(() => {
          if (cancelled) return;
          setCheckedUsername(normalizedUsername);
          setUsernameAvailability('error');
        });
    }, USERNAME_CHECK_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedUsername, step, usernameFormatError]);

  if (user?.onboarding_completed === true) return <Navigate to="/profile" replace />;

  function moveToUsernameStep(nextGrade: SelectableGrade) {
    setGrade(nextGrade);
    setStep('username');
    setError(null);
  }

  function handleGradeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!grade) {
      setError(t('onboarding.gradeRequired'));
      return;
    }

    moveToUsernameStep(grade);
  }

  async function ensureUsernameForAuthenticatedUser() {
    if (user?.username) return user;

    try {
      return await setMyUsername(normalizedUsername);
    } catch (err) {
      if (isIgnorableSetupConflict(err, ['username_already_set'])) return user;
      throw err;
    }
  }

  async function ensureGradeForAuthenticatedUser(nextGrade: SelectableGrade) {
    if (user?.grade) return user;

    try {
      return await setMyGrade(nextGrade);
    } catch (err) {
      if (isIgnorableSetupConflict(err, ['grade_already_set', 'onboarding_already_completed'])) {
        return user;
      }
      throw err;
    }
  }

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nextGrade = grade;
    if (!nextGrade) {
      setStep('grade');
      setError(t('onboarding.gradeRequired'));
      return;
    }

    const validationError = getUsernameValidationError(normalizedUsername, t, {
      required: true,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (usernameAvailability === 'checking') return;

    if (usernameAvailability !== 'available' || checkedUsername !== normalizedUsername) {
      setLoading(true);
      try {
        const result = await checkUsernameAvailability(normalizedUsername);
        setCheckedUsername(result.username);
        setUsernameAvailability(result.available ? 'available' : 'taken');
        if (!result.available) {
          setError(t('onboarding.usernameTaken'));
          return;
        }
      } catch {
        setError(t('onboarding.usernameCheckFailed'));
        return;
      } finally {
        setLoading(false);
      }
    }

    if (!token) {
      savePendingOnboardingDraft({
        grade: nextGrade,
        username: normalizedUsername,
      });
      navigate('/register', { replace: false });
      return;
    }

    setLoading(true);
    try {
      const userWithUsername = await ensureUsernameForAuthenticatedUser();
      if (userWithUsername) setUser(userWithUsername);

      const userWithGrade = await ensureGradeForAuthenticatedUser(nextGrade);
      if (userWithGrade) setUser(userWithGrade);

      clearPendingOnboardingDraft();
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, t('onboarding.usernameFailed')));
    } finally {
      setLoading(false);
    }
  }

  if (applyingDraft) {
    return (
      <AuthShell title={t('onboarding.title')}>
        <p className="text-[15px] leading-none text-text-body max-md:text-[16px] max-md:leading-none max-md:text-[#8c8698]" role="status">
          {t('onboarding.applyingDraft')}
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={step === 'grade' ? t('onboarding.gradeQuestionTitle') : t('onboarding.usernameQuestionTitle')}
      mobileHeaderMode="status-aware"
      desktopFlowStep={step === 'grade' ? 1 : 2}
      desktopContentWidth={step === 'grade' ? 'full' : 'narrow'}
    >
      {step === 'grade' ? (
        <form onSubmit={handleGradeSubmit} noValidate>
          <p className="mb-6 text-[15px] leading-none text-text-body max-md:mb-7 max-md:text-[16px] max-md:text-[#8c8698] min-[1440px]:text-[16px] min-[1440px]:text-[#8c8698]">
            {t('onboarding.gradeQuestionHelper')}
          </p>
          <div className="flex flex-col gap-2">
            {gradeOptions.map((option) => (
              <GradeOptionButton
                key={option}
                grade={option}
                label={getGradeOptionTitle(option, t)}
                selected={grade === option}
                disabled={loading}
                onClick={() => {
                  setGrade(option);
                  setError(null);
                }}
              />
            ))}
          </div>
          <FormError error={error} />
          <AuthSubmit
            loading={loading}
            disabled={!grade}
            mobileVisual="figma-auth"
            desktopVisual="onboarding"
          >
            {loading ? t('common.loading') : t('common.continue')}
          </AuthSubmit>
        </form>
      ) : (
        <form onSubmit={handleUsernameSubmit} noValidate>
          <p className="mb-8 text-[15px] leading-none text-text-body max-md:mb-6 max-md:text-[16px] max-md:text-[#8c8698] min-[1440px]:mb-6 min-[1440px]:h-7 min-[1440px]:text-[16px] min-[1440px]:text-[#8c8698]">
            {t('onboarding.usernameQuestionHelper')}
          </p>
          <AuthUsernameInput
            label={t('auth.username')}
            value={username}
            onChange={(value) => {
              setUsername(value);
              setError(null);
            }}
            onBlur={() => setUsernameTouched(true)}
            error={usernameFieldError ?? undefined}
            helperText={usernameHelperText}
            helperTone={usernameHelperTone}
            hideMobileLeadingIconWhenFilled
            mobileFieldLayout="figma-auth"
            desktopVisual="onboarding"
            desktopShowSuccessIcon={usernameHelperTone === 'success'}
          />
          <button
            type="button"
            onClick={() => {
              setStep('grade');
              setError(null);
            }}
            className="max-md:hidden min-[1440px]:hidden"
          >
            {t('common.previous')}
          </button>
          <AuthSubmit
            loading={loading}
            disabled={!usernameCanSubmit}
            mobileVisual="figma-auth"
            desktopVisual="onboarding"
          >
            {loading
              ? t('common.loading')
              : token
                ? t('onboarding.finishButton')
                : t('common.continue')}
          </AuthSubmit>
        </form>
      )}
    </AuthShell>
  );
}

function getGradeOptionTitle(grade: SelectableGrade, t: (key: string) => string) {
  if (grade === '10') return t('profile.grade10');
  if (grade === '11') return t('profile.grade11');
  return t('onboarding.gradeOtherTitle');
}

function GradeOptionButton({
  grade,
  label,
  selected,
  disabled,
  onClick,
}: {
  grade: SelectableGrade;
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const icon = grade === '10' ? Backpack02Icon : grade === '11' ? GraduationCapIcon : AnonymousIcon;

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant="surface"
      fullWidth
      className={`relative flex h-12 w-full items-center justify-start gap-4 rounded-[8px] bg-white px-6 text-left text-[16px] font-normal transition-colors disabled:cursor-wait disabled:opacity-70 min-[1440px]:justify-between min-[1440px]:bg-[#f8f5fc] ${
        grade === '11' ? 'min-[1440px]:order-1' : grade === '10' ? 'min-[1440px]:order-2' : 'min-[1440px]:order-3'
      } ${
        selected
          ? 'border-[1.5px] border-[#6a37c3] text-[#44237d] hover:!bg-white min-[1440px]:border-transparent min-[1440px]:text-[#161519] min-[1440px]:hover:!bg-[#f8f5fc]'
          : 'border border-transparent text-[#161519] hover:text-[#44237d] min-[1440px]:hover:text-[#161519]'
      }`}
      aria-pressed={selected}
    >
      <HugeiconsIcon
        icon={icon}
        size={16}
        strokeWidth={1.8}
        className="shrink-0 text-[#44237d] min-[1440px]:hidden"
      />
      <span className="min-w-0 flex-1">{label}</span>
      {!selected && (
        <span
          aria-hidden="true"
          className="hidden size-5 shrink-0 rounded-full border border-[#c5b1e7] min-[1440px]:block"
        />
      )}
      {selected && (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#6a37c3] text-white">
          <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2} />
        </span>
      )}
    </Button>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;

  return (
    <Text className="mt-2" tone="danger" size="helper" role="alert">
      {error}
    </Text>
  );
}
