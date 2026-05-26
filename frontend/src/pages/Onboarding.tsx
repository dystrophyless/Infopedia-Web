import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  GraduateMaleIcon,
  SchoolIcon,
  Tick02Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { useAuthStore } from '../stores/authStore';
import { checkUsernameAvailability, setMyGrade, setMyUsername } from '../api/users';
import { AuthShell, AuthSubmit, AuthUsernameInput } from '../components/AuthShell';
import type { UserGrade } from '../types';

type OnboardingStep = 'username' | 'grade';
type SelectableGrade = UserGrade;
type UsernameAvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

const gradeOptions: SelectableGrade[] = ['10', '11', 'undefined'];
const ONBOARDING_STEP_KEY = 'infopedia_onboarding_step';
const USERNAME_CHECK_DELAY_MS = 450;
const USERNAME_ALLOWED_PATTERN = /^[a-zA-Z0-9_.]+$/;

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

function getOnboardingErrorCode(err: unknown) {
  if (!axios.isAxiosError(err)) return null;

  const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail;
  if (
    detail &&
    typeof detail === 'object' &&
    'code' in detail &&
    typeof detail.code === 'string'
  ) {
    return detail.code;
  }

  return null;
}

function getInitialStep(hasUsername: boolean): OnboardingStep {
  if (hasUsername) return 'grade';
  if (typeof window === 'undefined') return 'username';
  return window.localStorage.getItem(ONBOARDING_STEP_KEY) === 'grade'
    ? 'grade'
    : 'username';
}

function getUsernameValidationError(
  username: string,
  t: (key: string) => string,
  { required }: { required: boolean },
) {
  if (!username) return required ? t('onboarding.usernameRequired') : null;
  if (username.length < 3 || username.length > 20) return t('onboarding.usernameLength');
  if (!USERNAME_ALLOWED_PATTERN.test(username)) return t('onboarding.usernameInvalid');
  if (
    username[0] === '.' ||
    username[0] === '_' ||
    username.at(-1) === '.' ||
    username.at(-1) === '_'
  ) {
    return t('onboarding.usernameInvalidEdge');
  }
  if (
    username.includes('..') ||
    username.includes('__') ||
    username.includes('._') ||
    username.includes('_.')
  ) {
    return t('onboarding.usernameInvalidRepeated');
  }

  return null;
}

export function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token, user, setUser } = useAuthStore();
  const [step, setStep] = useState<OnboardingStep>(() => getInitialStep(Boolean(user?.username)));
  const [username, setUsername] = useState('');
  const [usernameAvailability, setUsernameAvailability] =
    useState<UsernameAvailabilityStatus>('idle');
  const [checkedUsername, setCheckedUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [grade, setGrade] = useState<SelectableGrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    if (!user?.username || step === 'grade') return;
    setStep('grade');
    window.localStorage.setItem(ONBOARDING_STEP_KEY, 'grade');
  }, [step, user?.username]);

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

  if (!token) return <Navigate to="/login?next=/onboarding" replace />;
  if (user?.onboarding_completed === true) return <Navigate to="/profile" replace />;

  function moveToGradeStep() {
    setStep('grade');
    setError(null);
    window.localStorage.setItem(ONBOARDING_STEP_KEY, 'grade');
  }

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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

    setLoading(true);
    try {
      const user = await setMyUsername(normalizedUsername);
      setUser(user);
      moveToGradeStep();
    } catch (err) {
      if (getOnboardingErrorCode(err) === 'username_already_set') {
        moveToGradeStep();
        return;
      }
      setError(getErrorMessage(err, t('onboarding.usernameFailed')));
    } finally {
      setLoading(false);
    }
  }

  async function completeWithGrade(nextGrade: SelectableGrade) {
    if (loading) return;

    setError(null);
    setGrade(nextGrade);
    setLoading(true);
    try {
      const user = await setMyGrade(nextGrade);
      setUser(user);
      window.localStorage.removeItem(ONBOARDING_STEP_KEY);
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, t('onboarding.gradeFailed')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t('onboarding.title')}>
      {step === 'username' ? (
        <form onSubmit={handleUsernameSubmit} noValidate>
          <p className="mb-5 text-[15px] leading-snug text-text-body">
            {t('onboarding.usernameHelper')}
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
          />
          <AuthSubmit loading={loading} disabled={!usernameCanSubmit}>
            {loading ? t('common.loading') : t('common.next')}
          </AuthSubmit>
        </form>
      ) : (
        <div>
          <p className="mb-5 text-[15px] leading-snug text-text-body">
            {t('onboarding.gradeHelper')}
          </p>
          <div className="space-y-3">
            {gradeOptions.map((option) => (
              <GradeOptionButton
                key={option}
                grade={option}
                label={getGradeOptionTitle(option, t)}
                selected={grade === option}
                disabled={loading}
                onClick={() => completeWithGrade(option)}
              />
            ))}
          </div>
          <FormError error={error} />
        </div>
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
  const icon = grade === '10' ? SchoolIcon : grade === '11' ? GraduateMaleIcon : UserIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[64px] w-full items-center gap-4 rounded-[12px] border px-4 text-left text-[17px] font-medium transition-colors disabled:cursor-wait disabled:opacity-70 ${
        selected
          ? 'border-accent bg-bg text-primary'
          : 'border-border bg-surface text-text hover:border-accent'
      }`}
      aria-pressed={selected}
    >
      <HugeiconsIcon icon={icon} size={24} strokeWidth={1.8} className="shrink-0 text-accent" />
      <span className="min-w-0 flex-1">{label}</span>
      {selected && (
        <HugeiconsIcon
          icon={Tick02Icon}
          size={22}
          strokeWidth={2}
          className="shrink-0 text-accent"
        />
      )}
    </button>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;

  return (
    <p className="mt-3 text-[14px] text-danger" role="alert">
      {error}
    </p>
  );
}
