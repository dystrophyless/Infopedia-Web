export type ProfileTabId = 'profile' | 'progress' | 'weakTopics' | 'favorites' | 'settings';

const PROFILE_TABS = new Set<ProfileTabId>([
  'profile',
  'progress',
  'weakTopics',
  'favorites',
  'settings',
]);

export function parseProfileTab(searchParams: URLSearchParams): ProfileTabId {
  const requestedTab = searchParams.get('tab');
  return requestedTab && PROFILE_TABS.has(requestedTab as ProfileTabId)
    ? requestedTab as ProfileTabId
    : 'profile';
}

export function setProfileTab(searchParams: URLSearchParams, tab: ProfileTabId): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams);
  if (tab === 'profile') nextSearchParams.delete('tab');
  else nextSearchParams.set('tab', tab);
  return nextSearchParams;
}

export function shouldShowProfileLogout(tab: ProfileTabId) {
  return tab === 'profile' || tab === 'settings';
}
