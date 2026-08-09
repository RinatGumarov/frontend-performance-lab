import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('introduces the performance case study', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /rendering 100,000 trades without rerendering the dashboard/i,
      }),
    ).toBeVisible();
  });
});
