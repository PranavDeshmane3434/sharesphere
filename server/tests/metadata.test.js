jest.mock('../src/services/storage.service', () => ({
  buildObjectKey: (userId, uploadId, filename) => `uploads/${userId}/${uploadId}/${filename}`,
  getPresignedPutUrl: jest.fn().mockResolvedValue('https://fake-put.test'),
  getPresignedGetUrl: jest.fn().mockResolvedValue('https://fake-signed-url.test'),
  headObject: jest.fn().mockResolvedValue({ exists: true, sizeBytes: 1234 }),
}));

const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config/env');
const { cleanDb, createUser, prisma } = require('./helpers');

function tokenFor(user) {
  return jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn: '1h' });
}

beforeEach(async () => { await cleanDb(); });
afterAll(async () => { await prisma.$disconnect(); });

async function confirm(user, extra = {}) {
  const uploadId = crypto.randomUUID();
  const body = {
    uploadId,
    objectKey: `uploads/${user.id}/${uploadId}/notes.txt`,
    title: 'Test notes',
    type: 'TXT',
    category: 'NOTES',
    ...extra,
  };
  return request(app)
    .post('/api/resources/confirm')
    .set('Authorization', `Bearer ${tokenFor(user)}`)
    .send(body);
}

describe('Upload metadata validation', () => {
  test('stores category and academic metadata, normalizing the subject', async () => {
    const user = await createUser();
    const res = await confirm(user, {
      subject: '  Operating   Systems ',
      semester: 5,
      unit: 3,
      academicYear: '2026-27',
      category: 'QUESTION_PAPER',
    });
    expect(res.status).toBe(201);

    const saved = await prisma.resource.findUnique({ where: { id: res.body.id } });
    expect(saved.category).toBe('QUESTION_PAPER');
    expect(saved.subject).toBe('Operating Systems');
    expect(saved.semester).toBe(5);
    expect(saved.unit).toBe(3);
    expect(saved.academicYear).toBe('2026-27');
  });

  test('academic metadata is optional', async () => {
    const user = await createUser();
    const res = await confirm(user);
    expect(res.status).toBe(201);

    const saved = await prisma.resource.findUnique({ where: { id: res.body.id } });
    expect(saved.subject).toBeNull();
    expect(saved.semester).toBeNull();
    expect(saved.unit).toBeNull();
    expect(saved.academicYear).toBeNull();
  });

  test('blank optional fields are treated as not provided', async () => {
    const user = await createUser();
    const res = await confirm(user, { subject: '', semester: '', unit: '', academicYear: '' });
    expect(res.status).toBe(201);
  });

  test('category is required', async () => {
    const user = await createUser();
    const res = await confirm(user, { category: undefined });
    expect(res.status).toBe(400);
  });

  test('unknown category is rejected', async () => {
    const user = await createUser();
    const res = await confirm(user, { category: 'MEMES' });
    expect(res.status).toBe(400);
  });

  test.each([0, 9, -1, 2.5])('semester %p is rejected', async (semester) => {
    const user = await createUser();
    const res = await confirm(user, { semester });
    expect(res.status).toBe(400);
  });

  test.each([0, 11, -3])('unit %p is rejected', async (unit) => {
    const user = await createUser();
    const res = await confirm(user, { unit });
    expect(res.status).toBe(400);
  });

  test.each(['2026-28', '26-27', '2026-2027', '2026/27', 'abcd-ef'])(
    'academic year %p is rejected',
    async (academicYear) => {
      const user = await createUser();
      const res = await confirm(user, { academicYear });
      expect(res.status).toBe(400);
    },
  );
});

describe('Metadata filtering', () => {
  let viewerToken;

  async function seed() {
    const uploader = await createUser();
    const viewer = await createUser();
    viewerToken = tokenFor(viewer);

    const base = { uploaderId: uploader.id, type: 'TXT' };
    await prisma.resource.createMany({
      data: [
        { ...base, uploadId: 'f1', objectKey: 'f1.txt', title: 'R1', sizeBytes: 10,
          category: 'NOTES', subject: 'DBMS', semester: 5, unit: 3, academicYear: '2026-27' },
        { ...base, uploadId: 'f2', objectKey: 'f2.txt', title: 'R2', sizeBytes: 10,
          category: 'QUESTION_PAPER', subject: 'dbms', semester: 5, unit: 4, academicYear: '2025-26' },
        { ...base, uploadId: 'f3', objectKey: 'f3.txt', title: 'R3', sizeBytes: 10,
          category: 'NOTES', subject: 'Operating Systems', semester: 4, unit: 1, academicYear: '2026-27' },
        // legacy resource with no metadata at all
        { ...base, uploadId: 'f4', objectKey: 'f4.txt', title: 'R4', sizeBytes: 10 },
        // hidden resources must never show up in filter options
        { ...base, uploadId: 'f5', objectKey: 'f5.txt', title: 'R5', sizeBytes: 10,
          category: 'NOTES', subject: 'Hidden Subject', academicYear: '2024-25', status: 'HIDDEN' },
      ],
    });
  }

  async function titles(query) {
    const res = await request(app)
      .get(`/api/resources${query}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    return { res, titles: (res.body.results || []).map(r => r.title).sort() };
  }

  beforeEach(async () => { await seed(); });

  test('no filters returns every active resource, including legacy ones without metadata', async () => {
    const { titles: t } = await titles('');
    expect(t).toEqual(['R1', 'R2', 'R3', 'R4']);
  });

  test('subject filter is case-insensitive', async () => {
    const { titles: t } = await titles('?subject=DBMS');
    expect(t).toEqual(['R1', 'R2']);
  });

  test('semester filter', async () => {
    const { titles: t } = await titles('?semester=5');
    expect(t).toEqual(['R1', 'R2']);
  });

  test('category filter', async () => {
    const { titles: t } = await titles('?category=QUESTION_PAPER');
    expect(t).toEqual(['R2']);
  });

  test('unit filter', async () => {
    const { titles: t } = await titles('?unit=1');
    expect(t).toEqual(['R3']);
  });

  test('academic year filter', async () => {
    const { titles: t } = await titles('?academicYear=2026-27');
    expect(t).toEqual(['R1', 'R3']);
  });

  test('filters combine with AND', async () => {
    const { titles: t } = await titles('?subject=dbms&category=NOTES');
    expect(t).toEqual(['R1']);
  });

  test('listing returns the metadata fields', async () => {
    const { res } = await titles('?subject=DBMS&category=NOTES');
    const row = res.body.results[0];
    expect(row.category).toBe('NOTES');
    expect(row.semester).toBe(5);
    expect(row.unit).toBe(3);
    expect(row.academic_year).toBe('2026-27');
  });

  test('invalid filter values are rejected', async () => {
    expect((await titles('?category=MEMES')).res.status).toBe(400);
    expect((await titles('?semester=99')).res.status).toBe(400);
    expect((await titles('?academicYear=2026-30')).res.status).toBe(400);
  });

  test('filter options list distinct subjects and years from active resources only', async () => {
    const res = await request(app)
      .get('/api/resources/filters')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);

    const subjects = res.body.subjects.map(s => s.toLowerCase()).sort();
    expect(subjects).toEqual(['dbms', 'operating systems']);
    expect(res.body.academicYears).toEqual(['2026-27', '2025-26']);
  });
});