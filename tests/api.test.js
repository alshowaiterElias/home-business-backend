const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Set dummy JWT_SECRET for test runner
process.env.JWT_SECRET = 'test_jwt_secret_for_automated_testing_12345';
process.env.NODE_ENV = 'test';

const app = require('../src/app');

describe('Backend API Integration Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('GET /api/v1/health returns 200 OK and database status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
    assert.equal(data.database, 'connected');
  });

  it('POST /api/v1/auth/verify-firebase-token rejects missing idToken with 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/verify-firebase-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('GET /api/v1/products returns 200 OK with paginated list', async () => {
    const res = await fetch(`${baseUrl}/api/v1/products`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert(Array.isArray(data.data));
  });

  it('GET /api/v1/business returns 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/v1/business`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert(Array.isArray(data.data));
  });
});
