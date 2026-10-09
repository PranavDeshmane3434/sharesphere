const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const prisma = require('../src/prisma/client');

function assertSafeTestDb() {
  if (process.env.ALLOW_DB_WIPE !== 'true') {
    throw new Error(
      'Refusing to wipe the database: ALLOW_DB_WIPE is not set. Run tests with "npm test" and a valid .env.test.'
    );
  }

  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const mainUrl = dotenv.parse(fs.readFileSync(envPath)).DATABASE_URL;
    if (mainUrl && mainUrl === process.env.DATABASE_URL) {
      throw new Error(
        'Refusing to wipe the database: the test DATABASE_URL is the same as the one in .env.'
      );
    }
  }
}

async function cleanDb() {
  assertSafeTestDb();
  await prisma.transaction.deleteMany();
  await prisma.like.deleteMany();
  await prisma.report.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.user.deleteMany();
}

async function createUser(overrides = {}) {
  return prisma.user.create({
    data: {
      email: overrides.email || `user${Date.now()}${Math.random()}@test.com`,
      passwordHash: await bcrypt.hash('password123', 4),
      credits: overrides.credits ?? 10,
      role: overrides.role || 'USER',
    },
  });
}

module.exports = { cleanDb, createUser, prisma };