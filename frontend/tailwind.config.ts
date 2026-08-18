import type { Config } from 'tailwindcss';

const semanticColor = (variable: string, baseOpacity = '1') => {
  const alphaValue =
    baseOpacity === '1' ? '<alpha-value>' : `calc(${baseOpacity} * <alpha-value>)`;
  return `rgb(var(${variable}) / ${alphaValue})`;
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: semanticColor('--color-canvas-rgb'),
        surface: semanticColor('--color-surface-rgb'),
        'surface-muted': semanticColor('--color-surface-muted-rgb'),
        'surface-subtle': semanticColor('--color-surface-subtle-rgb'),
        'surface-inverse': semanticColor('--color-surface-inverse-rgb'),
        'text-strong': semanticColor('--color-text-strong-rgb'),
        'text-body': semanticColor('--color-text-body-rgb'),
        'text-muted': semanticColor('--color-text-muted-rgb'),
        'text-interactive': semanticColor('--color-text-interactive-rgb'),
        'text-placeholder': semanticColor('--color-text-placeholder-rgb'),
        'text-inverse': semanticColor('--color-text-inverse-rgb'),
        inverse: semanticColor('--color-text-inverse-rgb'),
        'decorative-muted': semanticColor('--color-decorative-muted-rgb', '0.5'),
        'border-subtle': semanticColor('--color-border-subtle-rgb', '0.45'),
        'border-default': semanticColor('--color-border-default-rgb'),
        'border-strong': semanticColor('--color-border-strong-rgb'),
        'border-interactive': semanticColor('--color-border-interactive-rgb'),
        action: {
          primary: semanticColor('--color-action-primary-rgb'),
          'primary-hover': semanticColor('--color-action-primary-hover-rgb'),
          secondary: semanticColor('--color-action-secondary-rgb'),
          selected: semanticColor('--color-action-selected-rgb'),
          emphasized: semanticColor('--color-action-emphasized-rgb'),
        },
        focus: semanticColor('--color-focus-rgb'),
        overlay: semanticColor('--color-overlay-rgb', '0.48'),
        highlight: semanticColor('--color-highlight-rgb'),
        success: {
          DEFAULT: semanticColor('--color-success-text-rgb'),
          text: semanticColor('--color-success-text-rgb'),
          surface: semanticColor('--color-success-surface-rgb'),
          accent: semanticColor('--color-success-accent-rgb'),
        },
        danger: {
          DEFAULT: semanticColor('--color-danger-text-rgb'),
          text: semanticColor('--color-danger-text-rgb'),
          surface: semanticColor('--color-danger-surface-rgb'),
          accent: semanticColor('--color-danger-accent-rgb'),
        },
        correct: {
          DEFAULT: semanticColor('--color-correct-text-rgb'),
          text: semanticColor('--color-correct-text-rgb'),
          surface: semanticColor('--color-correct-surface-rgb'),
          accent: semanticColor('--color-correct-accent-rgb'),
        },
        incorrect: {
          DEFAULT: semanticColor('--color-incorrect-text-rgb'),
          text: semanticColor('--color-incorrect-text-rgb'),
          surface: semanticColor('--color-incorrect-surface-rgb'),
          accent: semanticColor('--color-incorrect-accent-rgb'),
        },
        status: {
          low: {
            foreground: semanticColor('--color-status-low-foreground-rgb'),
            surface: semanticColor('--color-status-low-surface-rgb'),
            progress: semanticColor('--color-status-low-progress-rgb'),
            border: semanticColor('--color-status-low-border-rgb'),
            accent: semanticColor('--color-status-low-accent-rgb'),
          },
          review: {
            foreground: semanticColor('--color-status-review-foreground-rgb'),
            surface: semanticColor('--color-status-review-surface-rgb'),
            progress: semanticColor('--color-status-review-progress-rgb'),
            border: semanticColor('--color-status-review-border-rgb'),
            accent: semanticColor('--color-status-review-accent-rgb'),
          },
          good: {
            foreground: semanticColor('--color-status-good-foreground-rgb'),
            surface: semanticColor('--color-status-good-surface-rgb'),
            progress: semanticColor('--color-status-good-progress-rgb'),
            border: semanticColor('--color-status-good-border-rgb'),
            accent: semanticColor('--color-status-good-accent-rgb'),
          },
          excellent: {
            foreground: semanticColor('--color-status-excellent-foreground-rgb'),
            surface: semanticColor('--color-status-excellent-surface-rgb'),
            progress: semanticColor('--color-status-excellent-progress-rgb'),
            border: semanticColor('--color-status-excellent-border-rgb'),
            accent: semanticColor('--color-status-excellent-accent-rgb'),
          },
        },

        /* Legacy aliases kept while page-level styles migrate to semantic roles. */
        bg: semanticColor('--color-canvas-rgb'),
        primary: semanticColor('--color-action-primary-rgb'),
        accent: semanticColor('--color-action-primary-hover-rgb'),
        secondary: semanticColor('--color-action-secondary-rgb'),
        border: semanticColor('--color-border-default-rgb'),
        muted: semanticColor('--color-text-muted-rgb'),
        text: semanticColor('--color-text-strong-rgb'),
      },
      opacity: {
        12: '0.12',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        72: '0.72',
      },
      spacing: {
        'ui-1': 'var(--space-1)',
        'ui-2': 'var(--space-2)',
        'ui-3': 'var(--space-3)',
        'ui-4': 'var(--space-4)',
        'ui-5': 'var(--space-5)',
        'ui-6': 'var(--space-6)',
        'ui-8': 'var(--space-8)',
        'ui-10': 'var(--space-10)',
        'ui-12': 'var(--space-12)',
        'ui-16': 'var(--space-16)',
        'mobile-rail': 'var(--space-mobile-rail)',
      },
      fontFamily: {
        sans: ['"Mabry Pro"', 'sans-serif'],
      },
      fontSize: {
        'screen-title': [
          'var(--type-screen-title-size)',
          {
            lineHeight: 'var(--type-screen-title-line-height)',
            fontWeight: 'var(--type-screen-title-weight)',
          },
        ],
        'section-title': [
          'var(--type-section-title-size)',
          {
            lineHeight: 'var(--type-section-title-line-height)',
            fontWeight: 'var(--type-section-title-weight)',
          },
        ],
        'card-title': [
          'var(--type-card-title-size)',
          {
            lineHeight: 'var(--type-card-title-line-height)',
            fontWeight: 'var(--type-card-title-weight)',
          },
        ],
        body: [
          'var(--type-body-size)',
          {
            lineHeight: 'var(--type-body-line-height)',
            fontWeight: 'var(--type-body-weight)',
          },
        ],
        helper: [
          'var(--type-helper-size)',
          {
            lineHeight: 'var(--type-helper-line-height)',
            fontWeight: 'var(--type-helper-weight)',
          },
        ],
        caption: [
          'var(--type-caption-size)',
          {
            lineHeight: 'var(--type-caption-line-height)',
            fontWeight: 'var(--type-caption-weight)',
          },
        ],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        control: 'var(--radius-control)',
        surface: 'var(--radius-surface)',
        card: 'var(--radius-card)',
      },
      minHeight: {
        'touch-target': 'var(--control-touch-target)',
      },
      height: {
        'control-sm': 'var(--control-height-sm)',
        'control-md': 'var(--control-height-md)',
        'control-lg': 'var(--control-height-lg)',
      },
      maxWidth: {
        'shell-content': 'var(--shell-content-max-width)',
      },
      boxShadow: {
        card: 'var(--elevation-card)',
        feature: 'var(--elevation-feature)',
        overlay: 'var(--elevation-overlay)',
      },
      transitionDuration: {
        fast: 'var(--motion-duration-fast)',
        base: 'var(--motion-duration-base)',
        slow: 'var(--motion-duration-slow)',
      },
      transitionTimingFunction: {
        standard: 'var(--motion-easing-standard)',
        emphasized: 'var(--motion-easing-emphasized)',
      },
      zIndex: {
        base: 'var(--z-base)',
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        overlay: 'var(--z-overlay)',
        toast: 'var(--z-toast)',
      },
    },
  },
  plugins: [],
} satisfies Config;
