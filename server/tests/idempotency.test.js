jest.mock('../src/services/storage.service', () => ({
  buildObjectKey: (userId, uploadId, filename) => `uploads/${userId}/${uploadId}/${filename}`,
  getPresignedPutUrl: jest.fn().mockResolvedValue('https://fake-url.test'),
  getPresignedGetUrl: jest.fn().mockResolvedValue('https://fake-signed-url.test'),
  headObject: jest.fn().mockResolvedValue({ exists: true, sizeBytes: 1234 }),
}));

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

test('confirming the same upload twice does not duplicate resource or credits', async () => {
  const user = await createUser({ credits: 0 });
  const token = tokenFor(user);
  const uploadId = require('crypto').randomUUID();
  const objectKey = `uploads/${user.id}/${uploadId}/test.txt`;

  const body = { uploadId, objectKey, title: 'T', type: 'TXT' };

  const first = await request(app).post('/api/resources/confirm').set('Authorization', `Bearer ${token}`).send(body);
  expect(first.status).toBe(201);

  const second = await request(app).post('/api/resources/confirm').set('Authorization', `Bearer ${token}`).send(body);
  expect(second.status).toBe(200);
  expect(second.body.id).toBe(first.body.id);

  const resourceCount = await prisma.resource.count({ where: { uploadId } });
  expect(resourceCount).toBe(1);

  const finalUser = await prisma.user.findUnique({ where: { id: user.id } });
  expect(finalUser.credits).toBe(5); // awarded once, not twice
});