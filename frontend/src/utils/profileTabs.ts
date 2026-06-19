export type ProfileTabId = 'profile' | 'progress' | 'weakTopics' | 'favorites' | 'settings';

export function shouldShowProfileLogout(tab: ProfileTabId) {
  return tab === 'profile' || tab === 'settings';
}
