import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFound } from './NotFound';

describe('NotFound page', () => {
  it('renders 404 message and dashboard link', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText(/Page non trouvée \(404\)/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Retourner au tableau de bord/i })).toHaveAttribute(
      'href',
      '/dashboard'
    );
  });
});
