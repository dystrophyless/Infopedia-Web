import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch, post } = vi.hoisted(() => ({ patch: vi.fn(), post: vi.fn() }));

vi.mock('./client', () => ({
  apiClient: { patch, post },
}));

import {
  changeMyPassword,
  createMyPassword,
  updateMyUsername,
  verifyMyCurrentPassword,
} from './users';

describe('users API boundary', () => {
  beforeEach(() => {
    patch.mockReset();
    post.mockReset();
  });

  it('updates the authenticated user through the self-guarded user endpoint', async () => {
    const user = { id: 42, username: 'new_name' };
    patch.mockResolvedValueOnce({ data: user });

    await expect(updateMyUsername(42, 'new_name')).resolves.toBe(user);
    expect(patch).toHaveBeenCalledWith('/api/users/42', { username: 'new_name' });
  });

  it('changes the password through the self-guarded password endpoint without extra fields', async () => {
    patch.mockResolvedValueOnce({ data: undefined });

    await expect(changeMyPassword('Current123!', 'Next456!')).resolves.toBeUndefined();
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith('/api/users/me/password', {
      current_password: 'Current123!',
      new_password: 'Next456!',
    });
    expect(patch.mock.calls[0][1]).not.toHaveProperty('confirmation');
    expect(patch.mock.calls[0][1]).not.toHaveProperty('confirm_password');
  });

  it('creates a password with only the new password field', async () => {
    post.mockResolvedValueOnce({ data: { created: true } });

    await expect(createMyPassword('NewPassword123!')).resolves.toEqual({ created: true });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/api/users/me/password', {
      new_password: 'NewPassword123!',
    });
    expect(post.mock.calls[0][1]).not.toHaveProperty('current_password');
    expect(post.mock.calls[0][1]).not.toHaveProperty('confirm_password');
    expect(post.mock.calls[0][1]).not.toHaveProperty('confirmation');
    expect(post.mock.calls[0][1]).not.toHaveProperty('token');
  });

  it('verifies the current password through the dedicated endpoint without extra fields', async () => {
    post.mockResolvedValueOnce({ data: { verified: true } });

    await expect(verifyMyCurrentPassword('Current123!')).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/api/users/me/password/verify', {
      current_password: 'Current123!',
    });
    expect(post.mock.calls[0][1]).not.toHaveProperty('new_password');
    expect(post.mock.calls[0][1]).not.toHaveProperty('confirmation');
    expect(post.mock.calls[0][1]).not.toHaveProperty('token');
  });
});
