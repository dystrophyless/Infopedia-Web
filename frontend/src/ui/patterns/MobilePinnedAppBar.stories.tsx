import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../atoms';
import { MobilePinnedAppBar } from './MobilePinnedAppBar';

const meta = {
  title: 'Patterns/MobilePinnedAppBar',
  component: MobilePinnedAppBar,
  args: {
    title: 'Filters',
    leading: <Button aria-label="Go back" className="h-11 w-11 p-0" variant="ghost">&lt;</Button>,
    trailing: <Button aria-label="Close" className="h-11 w-11 p-0" variant="ghost">x</Button>,
  },
  parameters: {
    layout: 'fullscreen',
    viewport: { options: { mobile320: { name: 'Mobile 320', styles: { width: '320px', height: '568px' }, type: 'mobile' }, mobile390: { name: 'Mobile 390', styles: { width: '390px', height: '844px' }, type: 'mobile' }, mobile430: { name: 'Mobile 430', styles: { width: '430px', height: '932px' }, type: 'mobile' } } },
  },
} satisfies Meta<typeof MobilePinnedAppBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Mobile320: Story = { globals: { viewport: { value: 'mobile320', isRotated: false } } };
export const Mobile390: Story = { globals: { viewport: { value: 'mobile390', isRotated: false } } };
export const Mobile430: Story = { globals: { viewport: { value: 'mobile430', isRotated: false } } };
