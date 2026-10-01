const prisma = require('../prisma/client');

async function likeResource(userId, resourceId) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource || resource.status !== 'ACTIVE') {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  try {
    await prisma.like.create({ data: { userId, resourceId } });
  } catch (err) {
    if (err.code === 'P2002') {
      // Already liked — idempotent no-op, not an error
      return { liked: true };
    }
    throw err;
  }
  return { liked: true };
}

async function unlikeResource(userId, resourceId) {
  await prisma.like.deleteMany({ where: { userId, resourceId } });
  return { liked: false };
}

module.exports = { likeResource, unlikeResource };