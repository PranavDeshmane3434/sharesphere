const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config/env');
const { cleanDb, createUser, prisma } = require('./helpers');

function tokenFor(user) {
  return jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn: '1h' });
}

let uploader, viewer, resource;

function get(path, user) {
  const req = request(app).get(path);
  return user ? req.set('Authorization', `Bearer ${tokenFor(user)}`) : req;
}

beforeEach(async () => {
  await cleanDb();
  uploader = await createUser({ email: 'alice.smith@example.com' });
  viewer = await createUser();
  resource = await prisma.resource.create({
    data: {
      uploadId: 'd1',
      uploaderId: uploader.id,
      title: 'DBMS Unit 3 Notes',
      description: 'Normalization notes',
      type: 'PDF',
      category: 'NOTES',
      subject: 'DBMS',
      semester: 5,
      unit: 3,
      academicYear: '2026-27',
      sizeBytes: 2048,
      objectKey: 'd1.pdf',
    },
  });
});

afterAll(async () => { await prisma.$disconnect(); });

describe('Resource details', () => {
  test('returns full details of another user\'s resource', async () => {
    const res = await get(`/api/resources/${resource.id}`, viewer);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: resource.id,
      title: 'DBMS Unit 3 Notes',
      description: 'Normalization notes',
      type: 'PDF',
      category: 'NOTES',
      subject: 'DBMS',
      semester: 5,
      unit: 3,
      academic_year: '2026-27',
      size_bytes: '2048',
      is_mine: false,
      liked_by_me: false,
      like_count: 0,
      download_count: 0,
    });
  });

  test('shows only the part of the uploader\'s email before the @', async () => {
    const res = await get(`/api/resources/${resource.id}`, viewer);
    expect(res.body.uploader_name).toBe('alice.smith');
    expect(JSON.stringify(res.body)).not.toContain('example.com');
  });

  test('counts likes and downloads, ignoring upload rewards', async () => {
    const other = await createUser();
    await prisma.like.create({ data: { userId: viewer.id, resourceId: resource.id } });
    await prisma.like.create({ data: { userId: other.id, resourceId: resource.id } });

    await prisma.transaction.create({ data: { userId: viewer.id, resourceId: resource.id, type: 'SPEND', amount: 2 } });
    await prisma.transaction.create({ data: { userId: other.id, resourceId: resource.id, type: 'SPEND', amount: 2 } });
    await prisma.transaction.create({ data: { userId: uploader.id, resourceId: resource.id, type: 'EARN', amount: 5 } });

    const res = await get(`/api/resources/${resource.id}`, viewer);
    expect(res.body.like_count).toBe(2);
    expect(res.body.download_count).toBe(2);
    expect(res.body.liked_by_me).toBe(true);
  });

  test('marks the uploader\'s own resource with is_mine', async () => {
    const res = await get(`/api/resources/${resource.id}`, uploader);
    expect(res.status).toBe(200);
    expect(res.body.is_mine).toBe(true);
  });

  test('hidden and removed resources return 404', async () => {
    await prisma.resource.update({ where: { id: resource.id }, data: { status: 'HIDDEN' } });
    expect((await get(`/api/resources/${resource.id}`, viewer)).status).toBe(404);

    await prisma.resource.update({ where: { id: resource.id }, data: { status: 'REMOVED' } });
    expect((await get(`/api/resources/${resource.id}`, viewer)).status).toBe(404);
  });

  test('an unknown id returns 404', async () => {
    const res = await get('/api/resources/does-not-exist', viewer);
    expect(res.status).toBe(404);
  });

  test('requires authentication', async () => {
    const res = await get(`/api/resources/${resource.id}`);
    expect(res.status).toBe(401);
  });

  test('/filters is not swallowed by the /:id route', async () => {
    const res = await get('/api/resources/filters', viewer);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('subjects');
    expect(res.body).toHaveProperty('academicYears');
  });
});