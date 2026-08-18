import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { MultiSelectField, type MultiSelectFieldProps } from './MultiSelectField';

const meta: Meta<MultiSelectFieldProps> = {
  title: 'Molecules/MultiSelectField',
  component: MultiSelectField,
  args: {
    label: 'Books',
    selectedItems: [
      { id: 'informatics-10', label: 'Informatics, grade 10' },
      { id: 'informatics-11', label: 'Informatics, grade 11' },
    ],
    placeholder: 'Select books',
    openLabel: 'Open book options',
    onOpen: fn(),
    onRemove: fn(),
    getRemoveLabel: (item) => `Remove ${item.label}`,
    helperText: 'You can select more than one book.',
  },
  decorators: [(Story) => <div className="w-[360px]"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const VisibleSelections: Story = {
  args: { onOpen: fn(), onRemove: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove Informatics, grade 10' }),
    );
    await expect(args.onRemove).toHaveBeenCalledWith('informatics-10');

    await userEvent.click(canvas.getByRole('button', { name: 'Open book options' }));
    await expect(args.onOpen).toHaveBeenCalledOnce();
  },
};

export const Empty: Story = {
  args: {
    selectedItems: [],
    helperText: undefined,
  },
};

export const Error: Story = {
  args: {
    selectedItems: [],
    error: 'Select at least one book.',
  },
};
