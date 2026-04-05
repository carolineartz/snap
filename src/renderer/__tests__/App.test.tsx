import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('App', () => {
  it('renders the app header', async () => {
    render(<App />);

    expect(screen.getByText('Snappy')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument();
    });
  });

  it('shows empty state message', () => {
    render(<App />);

    expect(screen.getByText('No snaps yet')).toBeInTheDocument();
  });
});
