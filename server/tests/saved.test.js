const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config/env');
const { cleanDb, createUser, prisma } = require('./helpers');

function tokenFor(user) {
  return jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn: '1h' });
}

function authed(method, path, who) {
  return request(app)[method](path).set('Authorization', `Bearer ${tokenFor(who)}`);
}

let uploader, user, resource;

async function makeResource(uploadId, title = 'T') {
  return prisma.resource.create({
    data: { uploadId, uploaderId: uploader.id, title, type: 'TXT', sizeBytes: 10, objectKey: `${uploadId}.txt` },
  });
}

const save = (who, id = resource.id) => authed('put', `/api/resources/${id}/save`, who);
const unsave = (who, id = resource.id) => authed('delete', `/api/resources/${id}/save`, who);
const listSaved = (who, query = '') => authed('get', `/api/resources/saved${query}`, who);

beforeEach(async () => {
  await cleanDb();
  uploader = await createUser();
  user = await createUser();
  resource = await makeResource('s1', 'Saved one');
});

afterAll(async () => { await prisma.$disconnect(); });

describe('Saving resources', () => {
  test('a user can save a resource and it appears in their saved list', async () => {
    const res = await save(user);
    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);

    const list = await listSaved(user);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(list.body.results[0].id).toBe(resource.id);
  });

  test('saving twice is a no-op and leaves one row', async () => {
    await save(user);
    const second = await save(user);
    expect(second.status).toBe(200);
    expect(await prisma.savedResource.count({ where: { userId: user.id, resourceId: resource.id } })).toBe(1);
  });

  test('two simultaneous saves leave exactly one row', async () => {
    const [a, b] = await Promise.all([save(user), save(user)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(await prisma.savedResource.count({ where: { userId: user.id, resourceId: resource.id } })).toBe(1);
  });

  test('the uploader cannot save their own resource', async () => {
    const res = await save(uploader);
    expect(res.status).toBe(403);
    expect(await prisma.savedResource.count()).toBe(0);
  });

  test('hidden and removed resources cannot be saved', async () => {
    await prisma.resource.update({ where: { id: resource.id }, data: { status: 'HIDDEN' } });
    expect((await save(user)).status).toBe(404);

    await prisma.resource.update({ where: { id: resource.id }, data: { status: 'REMOVED' } });
    expect((await save(user)).status).toBe(404);
    expect(await prisma.savedResource.count()).toBe(0);
  });

  test('an unknown resource returns 404', async () => {
    expect((await save(user, 'does-not-exist')).status).toBe(404);
  });

  test('requires authentication', async () => {
    const put = await request(app).put(`/api/resources/${resource.id}/save`);
    const list = await request(app).get('/api/resources/saved');
    expect(put.status).toBe(401);
    expect(list.status).toBe(401);
  });
});

describe('Unsaving', () => {
  test('unsave removes it from the saved list', async () => {
    await save(user);
    const res = await unsave(user);
    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(false);
    expect((await listSaved(user)).body.total).toBe(0);
  });

  test('unsaving something that is not saved is harmless', async () => {
    const res = await unsave(user);
    expect(res.status).toBe(200);
  });

  test('a user can still unsave a resource that has since been hidden', async () => {
    await save(user);
    await prisma.resource.update({ where: { id: resource.id }, data: { status: 'HIDDEN' } });

    expect((await unsave(user)).status).toBe(200);
    expect(await prisma.savedResource.count({ where: { userId: user.id } })).toBe(0);
  });

  test('unsaving only affects the caller\'s own save', async () => {
    const other = await createUser();
    await save(user);
    await save(other);

    await unsave(user);
    expect((await listSaved(user)).body.total).toBe(0);
    expect((await listSaved(other)).body.total).toBe(1);
  });
});

describe('Saved list', () => {
  test('never shows another user\'s saved resources', async () => {
    const other = await createUser();
    await save(other);

    expect((await listSaved(user)).body.total).toBe(0);
    expect((await listSaved(other)).body.total).toBe(1);
  });

  test('hidden resources drop out of the list and return when restored', async () => {
    await save(user);

    await prisma.resource.update({ where: { id: resource.id }, data: { status: 'HIDDEN' } });
    expect((await listSaved(user)).body.total).toBe(0);
    expect(await prisma.savedResource.count({ where: { userId: user.id } })).toBe(1);

    await prisma.resource.update({ where: { id: resource.id }, data: { status: 'ACTIVE' } });
    expect((await listSaved(user)).body.total).toBe(1);
  });

  test('newest save comes first', async () => {
    const older = await makeResource('s2', 'Older save');
    const newer = await makeResource('s3', 'Newer save');
    await prisma.savedResource.create({
      data: { userId: user.id, resourceId: older.id, createdAt: new Date('2026-01-01') },
    });
    await prisma.savedResource.create({
      data: { userId: user.id, resourceId: newer.id, createdAt: new Date('2026-02-01') },
    });

    const titles = (await listSaved(user)).body.results.map(r => r.title);
    expect(titles).toEqual(['Newer save', 'Older save']);
  });

  test('items include counts, rating and the saved date', async () => {
    const rater = await createUser();
    await prisma.like.create({ data: { userId: rater.id, resourceId: resource.id } });
    await prisma.transaction.create({ data: { userId: rater.id, resourceId: resource.id, type: 'SPEND', amount: 2 } });
    await prisma.rating.create({ data: { userId: rater.id, resourceId: resource.id, value: 4 } });
    await save(user);

    const row = (await listSaved(user)).body.results[0];
    expect(row).toMatchObject({
      title: 'Saved one',
      size_bytes: '10',
      like_count: 1,
      download_count: 1,
      rating_avg: 4,
      rating_count: 1,
    });
    expect(row.saved_at).toBeDefined();
  });

  test('pagination returns the requested page and the full total', async () => {
    for (const n of [2, 3, 4]) {
      const extra = await makeResource(`p${n}`, `Extra ${n}`);
      await prisma.savedResource.create({ data: { userId: user.id, resourceId: extra.id } });
    }
    await save(user);

    const page1 = await listSaved(user, '?page=1&limit=3');
    const page2 = await listSaved(user, '?page=2&limit=3');
    expect(page1.body.total).toBe(4);
    expect(page1.body.results).toHaveLength(3);
    expect(page2.body.results).toHaveLength(1);
  });

  test('/saved is not swallowed by the /:id route', async () => {
    const res = await listSaved(user);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
  });
});

describe('saved_by_me flag', () => {
  test('the listing reports saved_by_me per user', async () => {
    const other = await createUser();
    await save(user);

    const asSaver = await authed('get', '/api/resources', user);
    const asOther = await authed('get', '/api/resources', other);
    expect(asSaver.body.results[0].saved_by_me).toBe(true);
    expect(asOther.body.results[0].saved_by_me).toBe(false);
  });

  test('the details endpoint reports saved_by_me per user', async () => {
    const other = await createUser();
    await save(user);

    const asSaver = await authed('get', `/api/resources/${resource.id}`, user);
    const asOther = await authed('get', `/api/resources/${resource.id}`, other);
    expect(asSaver.body.saved_by_me).toBe(true);
    expect(asOther.body.saved_by_me).toBe(false);
  });
});