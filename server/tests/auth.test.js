const request = require('supertest');
const app = require('../src/app'); // see note below
const { cleanDb } = require('./helpers');

beforeEach(async () => { await cleanDb(); });
afterAll(async () => { require('../src/prisma/client').$disconnect(); });

describe('Auth', () => {
  test('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@test.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('a@test.com');
    expect(res.body.credits).toBe(5);
  });

  test('rejects duplicate registration', async () => {
    await request(app).post('/api/auth/register').send({ email: 'a@test.com', password: 'password123' });
    const res = await request(app).post('/api/auth/register').send({ email: 'a@test.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  test('logs in with correct credentials and rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send({ email: 'a@test.com', password: 'password123' });

    const good = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'password123' });
    expect(good.status).toBe(200);
    expect(good.body.token).toBeDefined();

    const bad = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  test('rejects protected route without token', async () => {
    const res = await request(app).get('/api/resources');
    expect(res.status).toBe(401);
  });
});