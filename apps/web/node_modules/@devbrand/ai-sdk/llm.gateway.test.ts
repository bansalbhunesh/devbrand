import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completeText } from './llm.gateway';

describe('llm.gateway', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should fall back to local mock when ANTHROPIC_API_KEY is not set', async () => {
    // Ensure no API key
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const result = await completeText({
        promptKey: 'pr.brutal_truth',
        variables: ['Title', 'Body', 'Diff'],
      });

      expect(result.text).toContain('This PR is a classic example');
    } finally {
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    }
  });

  it('should throw an error for an unknown prompt key', async () => {
    await expect(
      completeText({
        promptKey: 'invalid_key' as any,
        variables: [],
      })
    ).rejects.toThrow();
  });
});
