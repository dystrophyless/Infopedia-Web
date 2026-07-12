import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Input } from '../atoms';
import { FormField } from './FormField';

const meta = {
  title: 'Molecules/FormField',
  component: FormField,
  args: {
    label: 'Название темы',
    children: () => null,
  },
  argTypes: {
    children: { control: false },
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: ({ children: _children, ...args }) => (
    <FormField {...args}>
      {(controlProps) => <Input {...controlProps} placeholder="Введите название" />}
    </FormField>
  ),
};

export const WithHelperText: Story = {
  args: { helperText: 'Название будет видно в результатах поиска.' },
  render: Default.render,
};

export const WithError: Story = {
  args: { error: 'Укажите название темы.' },
  render: Default.render,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Название темы' });
    const alert = canvas.getByRole('alert');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAttribute('aria-describedby', alert.id);
    await expect(alert).toHaveTextContent('Укажите название темы.');
  },
};

export const LongKazakhCopy: Story = {
  args: {
    label: 'Практикалық тапсырмаларға арналған тақырып атауы',
    helperText: 'Бұл атау іздеу нәтижелерінде және оқу жоспарыңызда көрсетіледі.',
  },
  render: Default.render,
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
};
