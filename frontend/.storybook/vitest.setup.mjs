import { afterEach, beforeAll, beforeEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import { setProjectAnnotations } from '@storybook/react-vite';
import * as a11yAnnotations from '@storybook/addon-a11y/preview';
import * as previewAnnotations from './preview';
import i18n from '../src/i18n';
import { useAuthStore } from '../src/stores/authStore';
import { useFavoritesStore } from '../src/features/favorites/model';
import { useSearchStore } from '../src/features/search/model';
import { useLangStore } from '../src/stores/langStore';

const annotations = setProjectAnnotations([a11yAnnotations, previewAnnotations]);

beforeAll(annotations.beforeAll);

beforeEach(async () => {
  await userEvent.unhover(document.body);
});

afterEach(async () => {
  useAuthStore.setState({ isAuthenticated: false, token: null, refreshToken: null, user: null });
  useFavoritesStore.getState().reset();
  useSearchStore.getState().reset();
  useSearchStore.getState().resetSearchFilters();
  useLangStore.getState().setLang('ru');
  await i18n.changeLanguage('ru');
});
