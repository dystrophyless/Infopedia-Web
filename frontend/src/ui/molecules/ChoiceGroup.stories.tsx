import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { CheckboxOption } from './CheckboxOption';
import { ChoiceGroup } from './ChoiceGroup';
import { RadioOption } from './RadioOption';

const meta = {
  title: 'Molecules/ChoiceGroup',
  component: ChoiceGroup,
  args: {
    label: 'Режим теста',
    children: null,
  },
  argTypes: {
    children: { control: false },
  },
} satisfies Meta<typeof ChoiceGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RadioChoices: Story = {
  render: (args) => (
    <ChoiceGroup {...args}>
      <RadioOption name="test-mode" value="quick" defaultChecked>Быстрый тест</RadioOption>
      <RadioOption name="test-mode" value="practice">Практические задания</RadioOption>
      <RadioOption name="test-mode" value="exam" disabled>Экзамен — скоро</RadioOption>
    </ChoiceGroup>
  ),
  play: async ({ canvas, userEvent }) => {
    const group = canvas.getByRole('group', { name: 'Режим теста' });
    const quick = canvas.getByRole('radio', { name: 'Быстрый тест' });
    const practice = canvas.getByRole('radio', { name: 'Практические задания' });

    await userEvent.tab();
    await expect(quick).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(practice).toBeChecked();
    await expect(group).toContainElement(practice);
  },
};

export const CheckboxChoices: Story = {
  args: { label: 'Фильтры поиска' },
  render: (args) => (
    <ChoiceGroup {...args}>
      <CheckboxOption defaultChecked>Только изученные темы</CheckboxOption>
      <CheckboxOption>Показывать примеры</CheckboxOption>
      <CheckboxOption lang="kk">Практикалық тапсырмаларды көрсету</CheckboxOption>
    </ChoiceGroup>
  ),
  play: async ({ canvas, userEvent }) => {
    const examples = canvas.getByRole('checkbox', { name: 'Показывать примеры' });
    await userEvent.click(examples);
    await expect(examples).toBeChecked();
  },
};

export const VisibleLegendAndLongCopy: Story = {
  args: {
    label: 'Іздеу нәтижелерінде қандай материалдарды көрсету керек?',
    labelHidden: false,
  },
  render: (args) => (
    <div style={{ width: 320 }}>
      <ChoiceGroup {...args}>
        <RadioOption name="content" value="all" defaultChecked>Барлық қолжетімді материалдар</RadioOption>
        <RadioOption name="content" value="practice">Практикалық есептері бар материалдар ғана</RadioOption>
      </ChoiceGroup>
    </div>
  ),
};
