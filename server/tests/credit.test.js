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

describe('Credit deduction concurrency', () => {
  test('two simultaneous downloads: exactly one succeeds, balance never negative', async () => {
    const uploader = await createUser({ credits: 0 });
    const resource = await prisma.resource.create({
      data: {
        uploadId: 'test-upload-1',
        uploaderId: uploader.id,
        title: 'Race Test Resource',
        type: 'TXT',
        sizeBytes: 100,
        objectKey: 'uploads/fake/key.txt',
      },
    });

    // exactly enough credits for ONE download (DOWNLOAD_COST = 2)
    const buyer = await createUser({ credits: 2 });
    const token = tokenFor(buyer);

    const [res1, res2] = await Promise.all([
      request(app).post(`/api/resources/${resource.id}/download`).set('Authorization', `Bearer ${token}`),
      request(app).post(`/api/resources/${resource.id}/download`).set('Authorization', `Bearer ${token}`),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 402]); // exactly one success, one insufficient-credits

    const finalUser = await prisma.user.findUnique({ where: { id: buyer.id } });
    expect(finalUser.credits).toBe(0);
    expect(finalUser.credits).toBeGreaterThanOrEqual(0); // never negative, redundant but explicit

    const spendCount = await prisma.transaction.count({ where: { userId: buyer.id, type: 'SPEND' } });
    expect(spendCount).toBe(1);
  });

  test('download fails with 402 when credits are insufficient, and nothing changes', async () => {
    const uploader = await createUser();
    const resource = await prisma.resource.create({
      data: { uploadId: 'test-upload-2', uploaderId: uploader.id, title: 'T', type: 'TXT', sizeBytes: 10, objectKey: 'k' },
    });
    const buyer = await createUser({ credits: 0 });
    const token = tokenFor(buyer);

    const res = await request(app).post(`/api/resources/${resource.id}/download`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(402);

    const count = await prisma.transaction.count({ where: { userId: buyer.id } });
    expect(count).toBe(0);
  });
});