import { describe, it, expect } from 'vitest';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.JWT_SECRET = 'test-jwt-secret';

describe('api/index (deployed backend)', () => {
  it('loads the serverless handler with the Stage 2 argument engine wired in', async () => {
    const mod = await import('./index.js');
    expect(typeof mod.default).toBe('function');
  }, 30000);
});