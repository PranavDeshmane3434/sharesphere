const request = require('supertest');
const app = require('../src/app');
const { cleanDb, createUser, prisma } = require('./helpers');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config/env');

function tokenFor(user) {
  return jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn: '1h' });
}

beforeEach(async () => { await cleanDb(); });
afterAll(async () => { await prisma.$disconnect(); });

test('reporting the same resource twice as the same user is rejected', async () => {
  const uploader = await createUser();
  const resource = await prisma.resource.create({
    data: { uploadId: 'r1', uploaderId: uploader.id, title: 'T', type: 'TXT', sizeBytes: 10, objectKey: 'k' },
  });
  const reporter = await createUser();
  const token = tokenFor(reporter);

  const first = await request(app).post(`/api/resources/${resource.id}/report`).set('Authorization', `Bearer ${token}`).send({ reason: 'Outdated content' });
  expect(first.status).toBe(201);

  const second = await request(app).post(`/api/resources/${resource.id}/report`).set('Authorization', `Bearer ${token}`).send({ reason: 'Still outdated' });
  expect(second.status).toBe(409);
});