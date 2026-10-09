jest.mock('../src/services/storage.service', () => ({
  buildObjectKey: (userId, uploadId, filename) => `uploads/${userId}/${uploadId}/${filename}`,
  getPresignedPutUrl: jest.fn().mockResolvedValue('https://fake-put.test'),
  getPresignedGetUrl: jest.fn().mockResolvedValue('https://fake-signed-url.test'),
  headObject: jest.fn().mockResolvedValue({ exists: true, sizeBytes: 100 }),
}));

const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config/env');
const { cleanDb, createUser, prisma } = require('./helpers');

function tokenFor(user) {
  return jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn: '1h' });
}

async function makeResource(uploaderId, uploadId) {
  return prisma.resource.create({
    data: { uploadId, uploaderId, title: 'T', type: 'TXT', sizeBytes: 10, objectKey: 'k.txt' },
  });
}

beforeEach(async () => { await cleanDb(); });
afterAll(async () => { await prisma.$disconnect(); });

describe('Own-resource behavior', () => {
  test('uploader cannot like their own resource', async () => {
    const owner = await createUser();
    const resource = await makeResource(owner.id, 'own-like-1');

    const res = await request(app)
      .put(`/api/resources/${resource.id}/like`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(res.status).toBe(403);
    expect(await prisma.like.count({ where: { resourceId: resource.id } })).toBe(0);
  });

  test('uploader cannot report their own resource', async () => {
    const owner = await createUser();
    const resource = await makeResource(owner.id, 'own-report-1');

    const res = await request(app)
      .post(`/api/resources/${resource.id}/report`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ reason: 'Reporting myself' });
    expect(res.status).toBe(403);
    expect(await prisma.report.count({ where: { resourceId: resource.id } })).toBe(0);
  });

  test('uploader downloads their own resource free: no credits spent, no ledger row', async () => {
    const owner = await createUser({ credits: 10 });
    const resource = await makeResource(owner.id, 'own-dl-1');

    const res = await request(app)
      .post(`/api/resources/${resource.id}/download`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toBeDefined();
    expect(res.body.free).toBe(true);

    const after = await prisma.user.findUnique({ where: { id: owner.id } });
    expect(after.credits).toBe(10);
    expect(await prisma.transaction.count({ where: { userId: owner.id, type: 'SPEND' } })).toBe(0);
  });

  test('uploader with zero credits can still download their own resource', async () => {
    const owner = await createUser({ credits: 0 });
    const resource = await makeResource(owner.id, 'own-dl-2');

    const res = await request(app)
      .post(`/api/resources/${resource.id}/download`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(res.status).toBe(200);
  });

  test('another user still pays for the same resource', async () => {
    const owner = await createUser();
    const buyer = await createUser({ credits: 10 });
    const resource = await makeResource(owner.id, 'paid-dl-1');

    const res = await request(app)
      .post(`/api/resources/${resource.id}/download`)
      .set('Authorization', `Bearer ${tokenFor(buyer)}`);
    expect(res.status).toBe(200);
    expect(res.body.free).toBe(false);

    const after = await prisma.user.findUnique({ where: { id: buyer.id } });
    expect(after.credits).toBe(8);
    expect(await prisma.transaction.count({ where: { userId: buyer.id, type: 'SPEND' } })).toBe(1);
  });

  test('another user can still like and report the resource', async () => {
    const owner = await createUser();
    const other = await createUser();
    const resource = await makeResource(owner.id, 'other-1');

    const like = await request(app)
      .put(`/api/resources/${resource.id}/like`)
      .set('Authorization', `Bearer ${tokenFor(other)}`);
    expect(like.status).toBe(200);

    const report = await request(app)
      .post(`/api/resources/${resource.id}/report`)
      .set('Authorization', `Bearer ${tokenFor(other)}`)
      .send({ reason: 'Outdated content' });
    expect(report.status).toBe(201);
  });

  test('listing marks own resources with is_mine', async () => {
    const owner = await createUser();
    const other = await createUser();
    await makeResource(owner.id, 'mine-1');

    const asOwner = await request(app).get('/api/resources').set('Authorization', `Bearer ${tokenFor(owner)}`);
    const asOther = await request(app).get('/api/resources').set('Authorization', `Bearer ${tokenFor(other)}`);

    expect(asOwner.body.results[0].is_mine).toBe(true);
    expect(asOther.body.results[0].is_mine).toBe(false);
  });
});