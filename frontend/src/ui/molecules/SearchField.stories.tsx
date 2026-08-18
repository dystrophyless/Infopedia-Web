import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { SearchField } from './SearchField';

const noop = () => undefined;

function SearchFieldDemo({ onClear, onSubmit }: { onClear: () => void; onSubmit: () => void }) {
  const [value, setValue] = useState('');

  return (
    <SearchField
      aria-label="Search terms"
      value={value}
      onChange={setValue}
      onClear={() => {
        onClear();
        setValue('');
      }}
      clearLabel="Clear search"
      onSubmit={onSubmit}
      clearOnEscape
      placeholder="Search by term"
      containerClassName="w-[320px]"
    />
  );
}

const meta = {
  title: 'Molecules/SearchField',
  component: SearchField,
  args: {
    value: '',
    onChange: fn(),
    onClear: fn(),
    clearLabel: 'Clear search',
    onSubmit: fn(),
    'aria-label': 'Search terms',
  },
  render: (args) => (
    <SearchFieldDemo onClear={args.onClear ?? noop} onSubmit={args.onSubmit ?? noop} />
  ),
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ClearAndSubmit: Story = {
  args: { onClear: fn(), onSubmit: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('searchbox', { name: 'Search terms' });

    await userEvent.type(input, 'algorithms{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear search' }));
    await expect(args.onClear).toHaveBeenCalledOnce();
    await expect(input).toHaveValue('');
  },
};

export const Loading: Story = {
  render: () => (
    <SearchField
      aria-label="Search terms"
      value="graph"
      onChange={() => undefined}
      loading
      loadingLabel="Searching"
      containerClassName="w-[320px]"
    />
  ),
};
