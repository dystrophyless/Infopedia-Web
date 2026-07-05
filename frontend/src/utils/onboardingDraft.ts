import axios from 'axios';
import { getMe, setMyGrade, setMyUsername } from '../api/users';
import type { User, UserGrade } from '../types';

const PENDING_ONBOARDING_DRAFT_KEY = 'infopedia_pending_onboarding_draft';

export interface PendingOnboardingDraft {
  grade: UserGrade;
  username: string;
}

function isSelectableGrade(value: unknown): value is UserGrade {
  return value === '10' || value === '11' || value === 'undefined';
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getOnboardingErrorCode(err: unknown): string | null {
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

export function readPendingOnboardingDraft(): PendingOnboardingDraft | null {
  if (!canUseStorage()) return null;

  try {
    const rawDraft = window.localStorage.getItem(PENDING_ONBOARDING_DRAFT_KEY);
    if (!rawDraft) return null;

    const draft = JSON.parse(rawDraft) as Partial<PendingOnboardingDraft>;
    if (!isSelectableGrade(draft.grade) || typeof draft.username !== 'string') {
      return null;
    }

    const username = draft.username.trim();
    if (!username) return null;

    return { grade: draft.grade, username };
  } catch {
    return null;
  }
}

export function savePendingOnboardingDraft(draft: PendingOnboardingDraft) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(
    PENDING_ONBOARDING_DRAFT_KEY,
    JSON.stringify({
      grade: draft.grade,
      username: draft.username.trim(),
    }),
  );
}

export function clearPendingOnboardingDraft() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(PENDING_ONBOARDING_DRAFT_KEY);
}

function isIgnorableSetupConflict(err: unknown, codes: string[]) {
  const code = getOnboardingErrorCode(err);
  return code !== null && codes.includes(code);
}

export async function applyPendingOnboardingDraft(): Promise<User | null> {
  const draft = readPendingOnboardingDraft();
  if (!draft) return null;

  let latestUser: User | null = null;

  try {
    latestUser = await setMyUsername(draft.username);
  } catch (err) {
    if (!isIgnorableSetupConflict(err, ['username_already_set', 'onboarding_already_completed'])) {
      throw err;
    }
  }

  try {
    latestUser = await setMyGrade(draft.grade);
  } catch (err) {
    if (!isIgnorableSetupConflict(err, ['grade_already_set', 'onboarding_already_completed'])) {
      throw err;
    }
  }

  clearPendingOnboardingDraft();
  return latestUser ?? getMe();
}
