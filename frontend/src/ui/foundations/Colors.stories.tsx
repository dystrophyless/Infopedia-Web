import type { Meta, StoryObj } from '@storybook/react-vite';

const colorTokens = [
  ['Canvas', '--color-canvas'],
  ['Surface', '--color-surface'],
  ['Muted surface', '--color-surface-muted'],
  ['Strong text', '--color-text-strong'],
  ['Body text', '--color-text-body'],
  ['Muted text', '--color-text-muted'],
  ['Decorative muted', '--color-decorative-muted'],
  ['Default border', '--color-border-default'],
  ['Subtle border', '--color-border-subtle'],
  ['Strong border', '--color-border-strong'],
  ['Primary action', '--color-action-primary'],
  ['Primary hover', '--color-action-primary-hover'],
  ['Secondary action', '--color-action-secondary'],
  ['Focus', '--color-focus'],
  ['Highlight', '--color-highlight'],
  ['Overlay', '--color-overlay'],
  ['Success text', '--color-success-text'],
  ['Success surface', '--color-success-surface'],
  ['Success accent', '--color-success-accent'],
  ['Danger text', '--color-danger-text'],
  ['Danger surface', '--color-danger-surface'],
  ['Danger accent', '--color-danger-accent'],
] as const;

const statusTokens = [
  ['Low', '--color-status-low-surface-rgb', '--color-status-low-foreground-rgb'],
  ['Review', '--color-status-review-surface-rgb', '--color-status-review-foreground-rgb'],
  ['Good', '--color-status-good-surface-rgb', '--color-status-good-foreground-rgb'],
  ['Excellent', '--color-status-excellent-surface-rgb', '--color-status-excellent-foreground-rgb'],
] as const;

const meta = {
  title: 'Foundations/Colors',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Semantic color roles. Components should consume these roles instead of raw color values.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SemanticPalette: Story = {
  render: () => (
    <section
      aria-label="Semantic color token reference"
      tabIndex={0}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        width: 'min(100%, 960px)',
        maxHeight: 'calc(100vh - 48px)',
        overflow: 'auto',
        padding: 4,
      }}
    >
      {colorTokens.map(([label, token]) => (
        <div key={token} style={{ minWidth: 0 }}>
          <div
            aria-hidden="true"
            style={{
              height: 88,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-surface)',
              background: `var(${token})`,
            }}
          />
          <div style={{ marginTop: 8, color: 'var(--color-text)', fontWeight: 500 }}>{label}</div>
          <code style={{ color: 'var(--color-text-body)', fontSize: 12 }}>{token}</code>
        </div>
      ))}
    </section>
  ),
};

export const ScoreStatuses: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, width: 'min(100%, 840px)' }}>
      {statusTokens.map(([label, surface, foreground]) => (
        <div
          key={label}
          style={{
            borderRadius: 'var(--radius-surface)',
            background: `rgb(var(${surface}))`,
            color: `rgb(var(${foreground}))`,
            padding: 'var(--space-5)',
            fontWeight: 500,
          }}
        >
          {label}
        </div>
      ))}
    </div>
  ),
};
