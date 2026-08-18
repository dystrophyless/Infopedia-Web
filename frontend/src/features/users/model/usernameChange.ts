export function resolveUsernameAvailability(
  currentUsername: string,
  candidateUsername: string,
  endpointAvailable: boolean,
): boolean {
  const current = currentUsername.trim();
  const candidate = candidateUsername.trim();

  if (candidate === current) return false;
  if (!endpointAvailable && current && candidate.toLowerCase() === current.toLowerCase()) {
    return true;
  }

  return endpointAvailable;
}

export function isUsernameConflictErrorResponse(
  status: number | undefined,
  detail: unknown,
): boolean {
  if (status !== 400) return false;

  if (typeof detail === 'string') {
    const normalized = detail.toLowerCase();
    const mentionsUsername = normalized.includes('username');
    const indicatesConflict =
      normalized.includes('already exists') ||
      normalized.includes('already taken') ||
      normalized.includes('уже существует') ||
      normalized.includes('занят');
    return mentionsUsername && indicatesConflict;
  }

  return false;
}
