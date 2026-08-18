import type { Meta, StoryObj } from '@storybook/react-vite';

const typeRoles = [
  ['Screen title', '--type-screen-title-size', '--type-screen-title-weight', '--type-screen-title-line-height'],
  ['Section title', '--type-section-title-size', '--type-section-title-weight', '--type-section-title-line-height'],
  ['Card title', '--type-card-title-size', '--type-card-title-weight', '--type-card-title-line-height'],
  ['Body', '--type-body-size', '--type-body-weight', '--type-body-line-height'],
  ['Helper', '--type-helper-size', '--type-helper-weight', '--type-helper-line-height'],
  ['Caption', '--type-caption-size', '--type-caption-weight', '--type-caption-line-height'],
] as const;

const meta = {
  title: 'Foundations/Typography',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Mabry Pro type roles with localized samples for line wrapping and Cyrillic coverage.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Roles: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 28, maxWidth: 920 }}>
      {typeRoles.map(([label, size, weight]) => (
        <section key={size}>
          <code style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{label} · {size}</code>
          <p
            style={{
              color: 'var(--color-text)',
              fontSize: `var(${size})`,
              fontWeight: `var(${weight})`,
              lineHeight: 1,
              margin: '8px 0 0',
            }}
          >
            Іздеу алгоритмдерін практикалық есептерді шешу үшін іске асыру
          </p>
        </section>
      ))}
    </div>
  ),
};

export const LongRussianAndKazakhCopy: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 20, maxWidth: 390 }}>
      <p style={{ fontSize: 'var(--type-body-size)', lineHeight: 1, margin: 0 }}>
        Изучите результаты анализа и выберите следующую тему, чтобы последовательно закрыть пробелы в знаниях.
      </p>
      <p style={{ fontSize: 'var(--type-body-size)', lineHeight: 1, margin: 0 }} lang="kk">
        Талдау нәтижелерін қарап шығып, білімдегі олқылықтарды біртіндеп толықтыру үшін келесі тақырыпты таңдаңыз.
      </p>
    </div>
  ),
};
