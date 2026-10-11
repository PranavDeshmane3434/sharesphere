const prisma = require('../prisma/client');

async function getRatingSummary(resourceId, userId) {
  const [agg, mine] = await Promise.all([
    prisma.rating.aggregate({
      where: { resourceId },
      _avg: { value: true },
      _count: { value: true },
    }),
    prisma.rating.findUnique({
      where: { userId_resourceId: { userId, resourceId } },
    }),
  ]);

  const avg = agg._avg.value;
  return {
    rating_average: avg === null ? null : Math.round(avg * 10) / 10,
    rating_count: agg._count.value,
    my_rating: mine ? mine.value : null,
  };
}

// The ledger is the proof of download: a SPEND row for this user and resource
async function hasDownloaded(userId, resourceId) {
  const row = await prisma.transaction.findFirst({
    where: { userId, resourceId, type: 'SPEND' },
    select: { id: true },
  });
  return !!row;
}

async function saveRating(userId, resourceId, value) {
  const where = { userId_resourceId: { userId, resourceId } };
  try {
    await prisma.rating.upsert({
      where,
      create: { userId, resourceId, value },
      update: { value },
    });
  } catch (err) {
    // Two simultaneous first-time ratings from the same user: the loser just updates
    if (err.code === 'P2002') {
      await prisma.rating.update({ where, data: { value } });
    } else {
      throw err;
    }
  }
}

async function rateResource(userId, resourceId, value) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource || resource.status !== 'ACTIVE') {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  if (resource.uploaderId === userId) {
    const err = new Error('You cannot rate your own resource');
    err.status = 403;
    throw err;
  }

  if (!(await hasDownloaded(userId, resourceId))) {
    const err = new Error('Download this resource before rating it');
    err.status = 403;
    throw err;
  }

  await saveRating(userId, resourceId, value);
  return getRatingSummary(resourceId, userId);
}

module.exports = { rateResource, getRatingSummary, hasDownloaded };