import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        icon={<span data-testid="icon">icon</span>}
        title="No files"
        description="Upload your first document."
      />
    );

    expect(screen.getByText('No files')).toBeInTheDocument();
    expect(screen.getByText('Upload your first document.')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders optional action', () => {
    render(
      <EmptyState
        icon={<span>icon</span>}
        title="Empty"
        action={<button type="button">Add item</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });
});
