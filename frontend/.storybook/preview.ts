import type { Preview } from '@storybook/react-vite';
import '../src/index.css';

const preview = {
  tags: ['autodocs', 'test'],
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
      // Approved source-palette exception: keep every axe rule blocking except
      // color-contrast, whose exact Figma colors are intentionally retained.
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
    backgrounds: {
      options: {
        app: { name: 'App canvas', value: '#efebf6' },
        surface: { name: 'Surface', value: '#ffffff' },
        dark: { name: 'Brand dark', value: '#3a1c6e' },
      },
    },
    viewport: {
      options: {
        mobile320: {
          name: 'Mobile 320',
          styles: { width: '320px', height: '568px' },
          type: 'mobile',
        },
        mobile360: {
          name: 'Mobile 360',
          styles: { width: '360px', height: '800px' },
          type: 'mobile',
        },
        mobile390: {
          name: 'Mobile 390',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
        mobile430: {
          name: 'Mobile 430 × 932',
          styles: { width: '430px', height: '932px' },
          type: 'mobile',
        },
        desktop1440: {
          name: 'Desktop 1440',
          styles: { width: '1440px', height: '900px' },
          type: 'desktop',
        },
        desktop1440x1080: {
          name: 'Desktop 1440 × 1080',
          styles: { width: '1440px', height: '1080px' },
          type: 'desktop',
        },
        desktop1280: {
          name: 'Desktop 1280',
          styles: { width: '1280px', height: '800px' },
          type: 'desktop',
        },
        desktop1231: {
          name: 'Desktop 1231 × 800',
          styles: { width: '1231px', height: '800px' },
          type: 'desktop',
        },
        desktop1024: {
          name: 'Desktop 1024',
          styles: { width: '1024px', height: '768px' },
          type: 'desktop',
        },
        desktop875x831: {
          name: 'Desktop 875 × 831',
          styles: { width: '875px', height: '831px' },
          type: 'desktop',
        },
      },
    },
  },
} satisfies Preview;

export default preview;
