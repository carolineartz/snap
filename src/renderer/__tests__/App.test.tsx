import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('App', () => {
  it('renders the app header', () => {
    render(<App />);
    expect(screen.getByText('Snappy')).toBeInTheDocument();
  });

  it('shows empty state when no snaps', async () => {
    render(<App />);
    expect(await screen.findByText('No snaps yet')).toBeInTheDocument();
  });
});
