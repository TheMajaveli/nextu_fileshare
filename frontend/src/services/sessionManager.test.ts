import { describe, expect, it, vi } from 'vitest';
import { notifyUnauthorized, setUnauthorizedHandler } from './sessionManager';

describe('sessionManager', () => {
  it('invokes registered unauthorized handler', () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    notifyUnauthorized();

    expect(handler).toHaveBeenCalledOnce();
    setUnauthorizedHandler(null);
  });

  it('does nothing when no handler is registered', () => {
    setUnauthorizedHandler(null);
    expect(() => notifyUnauthorized()).not.toThrow();
  });

  it('replaces handler when set again', () => {
    const first = vi.fn();
    const second = vi.fn();
    setUnauthorizedHandler(first);
    setUnauthorizedHandler(second);

    notifyUnauthorized();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    setUnauthorizedHandler(null);
  });
});
