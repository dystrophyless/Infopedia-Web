import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Foundations/Motion',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Motion must explain state change and respect prefers-reduced-motion.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TimingRoles: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 20, maxWidth: 680 }}>
      <style>{`
        .foundation-motion-sample {
          animation: foundation-motion calc(var(--motion-duration-slow) * 6) var(--motion-easing-standard) infinite alternate;
        }
        @keyframes foundation-motion {
          from { transform: translateX(0); }
          to { transform: translateX(220px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .foundation-motion-sample { animation: none; }
        }
      `}</style>
      <p style={{ margin: 0, color: 'var(--color-text-body)' }}>
        The sample stops automatically when the operating system requests reduced motion.
      </p>
      <div style={{ padding: 12, borderRadius: 'var(--radius-surface)', background: 'var(--color-surface)' }}>
        <div className="foundation-motion-sample" style={{ width: 44, height: 44, borderRadius: 'var(--radius-control)', background: 'var(--color-action-primary)' }} />
      </div>
    </div>
  ),
};
