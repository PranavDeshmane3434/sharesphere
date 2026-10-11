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

let uploader, resource;

async function makeResource(uploadId, title = 'T') {
  return prisma.resource.create({
    data: { uploadId, uploaderId: uploader.id, title, type: 'TXT', sizeBytes: 10, objectKey: `${uploadId}.txt` },
  });
}

// A SPEND ledger row is what the server treats as "has downloaded"
async function recordDownload(user, res = resource) {
  return prisma.transaction.create({
    data: { userId: user.id, resourceId: res.id, type: 'SPEND', amount: 2 },
  });
}

function rate(user, value, id = resource.id) {
  return request(app)
    .put(`/api/resources/${id}/rating`)
    .set('Authorization', `Bearer ${tokenFor(user)}`)
    .send({ value });
}

function details(user, id = resource.id) {
  return request(app)
    .get(`/api/resources/${id}`)
    .set('Authorization', `Bearer ${tokenFor(user)}`);
}

beforeEach(async () => {
  await cleanDb();
  uploader = await createUser();
  resource = await makeResource('r1');
});

afterAll(async () => { await prisma.$disconnect(); });

describe('Ratings: who can rate', () => {
  test('a user who has not downloaded cannot rate', async () => {
    const user = await createUser();
    const res = await rate(user, 5);
    expect(res.status).toBe(403);
    expect(await prisma.rating.count()).toBe(0);
  });

  test('a user who downloaded can rate', async () => {
    const user = await createUser();
    await recordDownload(user);
    const res = await rate(user, 4);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ rating_average: 4, rating_count: 1, my_rating: 4 });
  });

  test('rating becomes possible after a real download through the API', async () => {
    const user = await createUser({ credits: 10 });

    expect((await rate(user, 5)).status).toBe(403);

    const dl = await request(app)
      .post(`/api/resources/${resource.id}/download`)
      .set('Authorization', `Bearer ${tokenFor(user)}`);
    expect(dl.status).toBe(200);

    expect((await rate(user, 5)).status).toBe(200);
  });

  test('the uploader cannot rate their own resource, even with a ledger row', async () => {
    await recordDownload(uploader);
    const res = await rate(uploader, 5);
    expect(res.status).toBe(403);
    expect(await prisma.rating.count()).toBe(0);
  });

  test('hidden resources cannot be rated', async () => {
    const user = await createUser();
    await recordDownload(user);
    await prisma.resource.update({ where: { id: resource.id }, data: { status: 'HIDDEN' } });
    expect((await rate(user, 5)).status).toBe(404);
  });

  test('an unknown resource returns 404', async () => {
    const user = await createUser();
    expect((await rate(user, 5, 'does-not-exist')).status).toBe(404);
  });

  test('requires authentication', async () => {
    const res = await request(app).put(`/api/resources/${resource.id}/rating`).send({ value: 5 });
    expect(res.status).toBe(401);
  });
});

describe('Ratings: validation', () => {
  test.each([0, 6, -1, 2.5, '5', null])('value %p is rejected', async (value) => {
    const user = await createUser();
    await recordDownload(user);
    const res = await rate(user, value);
    expect(res.status).toBe(400);
    expect(await prisma.rating.count()).toBe(0);
  });

  test('a missing value is rejected', async () => {
    const user = await createUser();
    await recordDownload(user);
    const res = await request(app)
      .put(`/api/resources/${resource.id}/rating`)
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('every value from 1 to 5 is accepted', async () => {
    for (const value of [1, 2, 3, 4, 5]) {
      const user = await createUser();
      await recordDownload(user);
      expect((await rate(user, value)).status).toBe(200);
    }
  });

  test('the database itself rejects a value outside 1 to 5', async () => {
    const user = await createUser();
    await expect(
      prisma.rating.create({ data: { userId: user.id, resourceId: resource.id, value: 6 } }),
    ).rejects.toThrow();
  });
});

describe('Ratings: one per user, updatable', () => {
  test('rating again updates the rating instead of adding another', async () => {
    const user = await createUser();
    await recordDownload(user);

    await rate(user, 3);
    const res = await rate(user, 5);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ rating_average: 5, rating_count: 1, my_rating: 5 });
    expect(await prisma.rating.count({ where: { userId: user.id, resourceId: resource.id } })).toBe(1);
  });

  test('two simultaneous first-time ratings leave exactly one row', async () => {
    const user = await createUser();
    await recordDownload(user);

    const [a, b] = await Promise.all([rate(user, 4), rate(user, 5)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(await prisma.rating.count({ where: { userId: user.id, resourceId: resource.id } })).toBe(1);
  });

  test('the average and count combine different users', async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    await recordDownload(u1);
    await recordDownload(u2);

    await rate(u1, 4);
    const res = await rate(u2, 5);
    expect(res.body).toMatchObject({ rating_average: 4.5, rating_count: 2, my_rating: 5 });
  });
});

describe('Ratings: details and listing', () => {
  test('details report average, count, my rating and can_rate', async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    await recordDownload(u1);
    await rate(u1, 4);

    const asRater = await details(u1);
    expect(asRater.body).toMatchObject({ rating_average: 4, rating_count: 1, my_rating: 4, can_rate: true });

    // another user sees the same average but not u1's personal rating
    const asOther = await details(u2);
    expect(asOther.body).toMatchObject({ rating_average: 4, rating_count: 1, my_rating: null, can_rate: false });
  });

  test('can_rate is false for the uploader and true after downloading', async () => {
    const user = await createUser();
    expect((await details(uploader)).body.can_rate).toBe(false);
    expect((await details(user)).body.can_rate).toBe(false);

    await recordDownload(user);
    expect((await details(user)).body.can_rate).toBe(true);
  });

  test('an unrated resource reports no average', async () => {
    const user = await createUser();
    const res = await details(user);
    expect(res.body).toMatchObject({ rating_average: null, rating_count: 0, my_rating: null });
  });

  test('the listing includes rating_avg and rating_count', async () => {
    const user = await createUser();
    await recordDownload(user);
    await rate(user, 4);

    const res = await request(app)
      .get('/api/resources')
      .set('Authorization', `Bearer ${tokenFor(user)}`);
    expect(res.body.results[0]).toMatchObject({ rating_avg: 4, rating_count: 1 });
  });

  test('likes and downloads do not inflate the listing rating', async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    await recordDownload(u1);
    await recordDownload(u2);
    await prisma.like.create({ data: { userId: u1.id, resourceId: resource.id } });
    await prisma.like.create({ data: { userId: u2.id, resourceId: resource.id } });
    await rate(u1, 3);
    await rate(u2, 5);

    const res = await request(app)
      .get('/api/resources')
      .set('Authorization', `Bearer ${tokenFor(u1)}`);
    const row = res.body.results[0];
    expect(row.rating_avg).toBe(4);
    expect(row.rating_count).toBe(2);
    expect(row.like_count).toBe(2);
    expect(row.download_count).toBe(2);
  });
});

describe('Sorting: highest rated', () => {
  test('orders by average, then by number of ratings, with unrated last', async () => {
    const perfect = await makeResource('top', 'Perfect');   // 5.0 from 1 rating
    const solid = await makeResource('mid', 'Solid');       // 4.0 from 2 ratings
    const unrated = await makeResource('none', 'Unrated');  // no ratings
    // `resource` (title "T") also exists and is unrated

    const u1 = await createUser();
    const u2 = await createUser();
    await recordDownload(u1, perfect);
    await recordDownload(u1, solid);
    await recordDownload(u2, solid);

    await rate(u1, 5, perfect.id);
    await rate(u1, 4, solid.id);
    await rate(u2, 4, solid.id);

    const res = await request(app)
      .get('/api/resources?sort=highest_rated')
      .set('Authorization', `Bearer ${tokenFor(u1)}`);
    expect(res.status).toBe(200);

    const titles = res.body.results.map(r => r.title);
    expect(titles[0]).toBe('Perfect');
    expect(titles[1]).toBe('Solid');
    expect(titles.slice(2).sort()).toEqual(['T', 'Unrated']);
    expect(unrated).toBeDefined();
  });
});