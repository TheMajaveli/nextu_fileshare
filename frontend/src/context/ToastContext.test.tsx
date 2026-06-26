import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToasts } from './ToastContext';

function ToastTrigger() {
  const { showToast } = useToasts();
  return (
    <div>
      <button type="button" onClick={() => showToast('Saved', 'success')}>
        success
      </button>
      <button type="button" onClick={() => showToast('Failed', 'error')}>
        error
      </button>
    </div>
  );
}

describe('ToastContext', () => {
  it('shows a success toast', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    await user.click(screen.getByRole('button', { name: 'success' }));
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows an error toast', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    await user.click(screen.getByRole('button', { name: 'error' }));
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('supports multiple toast types', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    await user.click(screen.getByRole('button', { name: 'success' }));
    await user.click(screen.getByRole('button', { name: 'error' }));

    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('throws when useToasts is used outside provider', () => {
    const Broken = () => {
      useToasts();
      return null;
    };

    expect(() => render(<Broken />)).toThrow(/ToastProvider/);
  });
});
