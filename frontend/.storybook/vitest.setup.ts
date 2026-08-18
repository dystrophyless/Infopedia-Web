import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/react-vite';
import * as a11yAnnotations from '@storybook/addon-a11y/preview';
import * as previewAnnotations from './preview';

const annotations = setProjectAnnotations([a11yAnnotations, previewAnnotations]);

beforeAll(annotations.beforeAll);
