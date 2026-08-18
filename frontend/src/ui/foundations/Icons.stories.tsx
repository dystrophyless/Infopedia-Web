import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  BookOpen01Icon,
  Search01Icon,
  Tick02Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

const icons = [
  ['Search', Search01Icon],
  ['Book', BookOpen01Icon],
  ['User', UserIcon],
  ['Next', ArrowRight01Icon],
  ['Success', Tick02Icon],
  ['Alert', AlertCircleIcon],
] as const;

const meta = {
  title: 'Foundations/Icons',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Hugeicons are decorative by default. Interactive controls receive their accessible name from the control, not the glyph.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const CommonGlyphs: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {icons.map(([label, icon]) => (
        <div key={label} style={{ display: 'grid', placeItems: 'center', gap: 8, width: 112, minHeight: 96, borderRadius: 'var(--radius-surface)', background: 'var(--color-surface)', color: 'var(--color-primary)' }}>
          <HugeiconsIcon icon={icon} size={28} strokeWidth={1.8} aria-hidden="true" />
          <span style={{ color: 'var(--color-text-body)', fontSize: 14 }}>{label}</span>
        </div>
      ))}
    </div>
  ),
};
