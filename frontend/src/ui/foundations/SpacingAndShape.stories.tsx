import type { Meta, StoryObj } from '@storybook/react-vite';

const spacing = [
  ['1', '--space-1'],
  ['2', '--space-2'],
  ['3', '--space-3'],
  ['4', '--space-4'],
  ['5', '--space-5'],
  ['6', '--space-6'],
  ['8', '--space-8'],
  ['10', '--space-10'],
  ['12', '--space-12'],
  ['16', '--space-16'],
] as const;
const radii = [
  ['Control', '--radius-control'],
  ['Surface', '--radius-surface'],
  ['Card', '--radius-card'],
] as const;

const meta = {
  title: 'Foundations/Spacing and shape',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpacingScale: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 680 }}>
      {spacing.map(([step, token]) => (
        <div key={token} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', alignItems: 'center', gap: 12 }}>
          <code>space-{step}</code>
          <div style={{ width: `calc(var(${token}) * 4)`, maxWidth: '100%', height: 16, borderRadius: 'var(--radius-xs)', background: 'var(--color-action-primary)' }} />
        </div>
      ))}
    </div>
  ),
};

export const RadiusRoles: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {radii.map(([label, token]) => (
        <div key={token}>
          <div
            style={{
              width: 144,
              height: 96,
              border: '2px solid var(--color-action-primary)',
              borderRadius: `var(${token})`,
              background: 'var(--color-surface)',
            }}
          />
          <div style={{ marginTop: 8, fontWeight: 500 }}>{label}</div>
          <code style={{ fontSize: 12 }}>{token}</code>
        </div>
      ))}
    </div>
  ),
};

export const ControlHeights: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16 }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} style={{ display: 'grid', placeItems: 'center', width: 100, height: `var(--control-height-${size})`, borderRadius: 'var(--radius-control)', background: 'var(--color-action-primary)', color: 'var(--color-surface)' }}>
          {size.toUpperCase()}
        </div>
      ))}
    </div>
  ),
};
