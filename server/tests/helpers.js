const prisma = require('../src/prisma/client');

async function cleanDb() {
  await prisma.transaction.deleteMany();
  await prisma.like.deleteMany();
  await prisma.report.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.user.deleteMany();
}

async function createUser(overrides = {}) {
  const bcrypt = require('bcrypt');
  return prisma.user.create({
    data: {
      email: overrides.email || `user${Date.now()}${Math.random()}@test.com`,
      passwordHash: await bcrypt.hash('password123', 4), // low cost in tests, speed matters
      credits: overrides.credits ?? 10,
      role: overrides.role || 'USER',
    },
  });
}

module.exports = { cleanDb, createUser, prisma };