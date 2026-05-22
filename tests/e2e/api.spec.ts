import { test, expect } from '@playwright/test';

test.describe('API Endpoint E2E Tests', () => {
  test('REST API: GET /api/v1/repos/:owner/:repo/verdict should return 404 for unknown repo', async ({ request }) => {
    const response = await request.get('/api/v1/repos/bansalbhunesh/unknown-repo/verdict');
    expect(response.status()).toBe(404);
    
    const body = await response.json();
    expect(body.error).toBe('Repository not tracked');
  });

  test('GraphQL API: Should resolve basic queries', async ({ request }) => {
    const response = await request.post('/api/graphql', {
      data: {
        query: `
          query {
            topRepositories {
              owner
              name
            }
          }
        `
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.data).toHaveProperty('topRepositories');
    expect(Array.isArray(result.data.topRepositories)).toBe(true);
  });
});
