/**
 * Unit tests for getCurrentUserWithRoles (src/lib/supabase/session.ts).
 *
 * This is the single choke point every server-side auth check funnels
 * through (authn.ts's requireAuthentication/hasValidSession/etc.), so
 * jest.setup.js mocks it globally for every other test suite. This file
 * un-mocks it specifically to exercise the real implementation, mocking
 * its own dependencies instead.
 */

jest.unmock('@/lib/supabase/session');

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));
jest.mock('@/lib/database', () => ({
  connectToDatabase: jest.fn(),
}));
jest.mock('@/models/User', () => ({
  User: { findById: jest.fn() },
}));

import { getCurrentUserWithRoles } from '@/lib/supabase/session';
import { createClient } from '@/lib/supabase/server';
import { User } from '@/models/User';

const mockCreateClient = createClient as jest.Mock;
const mockFindById = User.findById as jest.Mock;

function mockClaims(claims: Record<string, unknown> | null, error: unknown = null) {
  mockCreateClient.mockResolvedValue({
    auth: {
      getClaims: jest.fn().mockResolvedValue({
        data: claims ? { claims } : null,
        error,
      }),
    },
  });
}

describe('getCurrentUserWithRoles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for an archived user, even with valid Supabase claims', async () => {
    mockClaims({ sub: 'user-1', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) + 3600 });
    mockFindById.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['admin'],
      is_archived: true,
    });

    const session = await getCurrentUserWithRoles();

    expect(session).toBeNull();
  });

  it('returns a session for a non-archived user', async () => {
    mockClaims({ sub: 'user-1', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) + 3600 });
    mockFindById.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['admin'],
      is_archived: false,
    });

    const session = await getCurrentUserWithRoles();

    expect(session).not.toBeNull();
    expect(session?.user).toEqual({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['admin'],
    });
  });

  it('does not reject when no matching users row exists at all', async () => {
    mockClaims({ sub: 'user-1', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) + 3600 });
    mockFindById.mockResolvedValue(null);

    const session = await getCurrentUserWithRoles();

    expect(session).not.toBeNull();
    expect(session?.user.roles).toEqual(['guest']);
  });

  it('returns null when Supabase has no valid claims', async () => {
    mockClaims(null, { message: 'no session' });

    const session = await getCurrentUserWithRoles();

    expect(session).toBeNull();
    expect(mockFindById).not.toHaveBeenCalled();
  });
});
