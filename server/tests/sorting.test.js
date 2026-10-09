const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config/env');
const { cleanDb, createUser, prisma } = require('./helpers');

function tokenFor(user) {
  return jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn: '1h' });
}

let viewer, token;
let small, medium, large; // small = oldest, large = newest

async function makeResource(uploaderId, uploadId, title, sizeBytes, createdAt) {
  return prisma.resource.create({
    data: { uploadId, uploaderId, title, type: 'TXT', sizeBytes, objectKey: `${uploadId}.txt`, createdAt },
  });
}

async function fetchTitles(query = '') {
  const res = await request(app)
    .get(`/api/resources${query}`)
    .set('Authorization', `Bearer ${token}`);
  return { res, titles: (res.body.results || []).map(r => r.title) };
}

beforeEach(async () => {
  await cleanDb();
  const uploader = await createUser();
  viewer = await createUser();
  token = tokenFor(viewer);

  small = await makeResource(uploader.id, 's1', 'Small', 100, new Date('2026-01-01'));
  medium = await makeResource(uploader.id, 's2', 'Medium', 5000, new Date('2026-02-01'));
  large = await makeResource(uploader.id, 's3', 'Large', 90000, new Date('2026-03-01'));

  // Medium: 2 likes, 1 download. Large: 1 like, 3 downloads. Small: none.
  const extra = await createUser();
  await prisma.like.create({ data: { userId: viewer.id, resourceId: medium.id } });
  await prisma.like.create({ data: { userId: extra.id, resourceId: medium.id } });
  await prisma.like.create({ data: { userId: viewer.id, resourceId: large.id } });

  await prisma.transaction.create({ data: { userId: viewer.id, resourceId: medium.id, type: 'SPEND', amount: 2 } });
  for (let i = 0; i < 3; i++) {
    await prisma.transaction.create({ data: { userId: viewer.id, resourceId: large.id, type: 'SPEND', amount: 2 } });
  }
});

afterAll(async () => { await prisma.$disconnect(); });

describe('Single-select sorting', () => {
  test('newest is the default', async () => {
    const { titles } = await fetchTitles();
    expect(titles).toEqual(['Large', 'Medium', 'Small']);
  });

  test('sort=newest', async () => {
    const { titles } = await fetchTitles('?sort=newest');
    expect(titles).toEqual(['Large', 'Medium', 'Small']);
  });

  test('sort=oldest', async () => {
    const { titles } = await fetchTitles('?sort=oldest');
    expect(titles).toEqual(['Small', 'Medium', 'Large']);
  });

  test('sort=size_asc', async () => {
    const { titles } = await fetchTitles('?sort=size_asc');
    expect(titles).toEqual(['Small', 'Medium', 'Large']);
  });

  test('sort=size_desc', async () => {
    const { titles } = await fetchTitles('?sort=size_desc');
    expect(titles).toEqual(['Large', 'Medium', 'Small']);
  });

  test('sort=most_liked puts the most-liked resource first', async () => {
    const { titles } = await fetchTitles('?sort=most_liked');
    expect(titles[0]).toBe('Medium');
    expect(titles[1]).toBe('Large');
  });

  test('sort=most_downloaded puts the most-downloaded resource first', async () => {
    const { titles } = await fetchTitles('?sort=most_downloaded');
    expect(titles[0]).toBe('Large');
    expect(titles[1]).toBe('Medium');
  });

  test('multiple sort values are rejected', async () => {
    const { res } = await fetchTitles('?sort=newest,size_asc');
    expect(res.status).toBe(400);
  });

  test('an unknown sort value is rejected', async () => {
    const { res } = await fetchTitles('?sort=cheapest');
    expect(res.status).toBe(400);
  });

  test('sorting composes with the type filter and pagination', async () => {
    const { res } = await fetchTitles('?type=TXT&sort=size_desc&page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.results.map(r => r.title)).toEqual(['Large', 'Medium']);
  });
});