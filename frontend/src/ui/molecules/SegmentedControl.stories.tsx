import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { SegmentedControl } from './SegmentedControl';

const options = [{ value: 'all', label: 'All' }, { value: 'terms', label: 'Terms' }, { value: 'definitions', label: 'Definitions', disabled: true }] as const;
function Demo() { const [value, setValue] = useState<(typeof options)[number]['value']>('all'); return <SegmentedControl name="content" label="Content type" options={options} value={value} onValueChange={setValue} />; }
const meta = { title: 'Molecules/SegmentedControl', component: SegmentedControl, args: { name: 'content', label: 'Content type', options }, render: () => <Demo /> } satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;
export const KeyboardAndDisabled: Story = { play: async ({ canvasElement }) => { const canvas = within(canvasElement); const all = canvas.getByRole('radio', { name: 'All' }); const terms = canvas.getByRole('radio', { name: 'Terms' }); const definitions = canvas.getByRole('radio', { name: 'Definitions' }); await expect(all).toBeChecked(); await expect(definitions).toBeDisabled(); all.focus(); await userEvent.keyboard('{ArrowRight}'); await expect(terms).toHaveFocus(); await expect(terms).toBeChecked(); await userEvent.keyboard(' '); await expect(terms).toBeChecked(); } };
