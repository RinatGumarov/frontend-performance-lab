import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { App } from '../app/App';

const meta = {
  title: 'Compositions/Application states',
  component: App,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Optimized10K: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('radio', { name: 'Optimized' })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: '10K' })).toBeChecked();
  },
};

export const BaselineCapped: Story = {
  parameters: {
    a11y: {
      test: 'off',
    },
    docs: {
      description: {
        story:
          'This application state deliberately mounts 10,000 rows, so its duplicate axe pass is disabled. The equivalent small baseline composition remains accessibility-checked.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: 'Baseline' }));
    await expect(canvas.getByRole('radio', { name: '10K' })).toBeChecked();
    await expect(
      canvas.getByText(
        'Baseline is capped at 10,000 rows to keep this tab responsive.',
      ),
    ).toBeVisible();
  },
};
