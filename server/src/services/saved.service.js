const prisma = require('../prisma/client');

async function saveResource(userId, resourceId) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource || resource.status !== 'ACTIVE') {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  if (resource.uploaderId === userId) {
    const err = new Error('You cannot save your own resource');
    err.status = 403;
    throw err;
  }

  try {
    await prisma.savedResource.create({ data: { userId, resourceId } });
  } catch (err) {
    // Already saved: idempotent no-op
    if (err.code !== 'P2002') throw err;
  }
  return { saved: true };
}

// No status check on purpose: users can always clean up their own list
async function unsaveResource(userId, resourceId) {
  await prisma.savedResource.deleteMany({ where: { userId, resourceId } });
  return { saved: false };
}

// Only ever reads the caller's own saves: there is no way to pass another user's id
async function listSaved(userId, { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;

  const rows = await prisma.$queryRaw`
    SELECT
      r.id, r.title, r.description, r.type, r.size_bytes, r.created_at,
      r.category, r.subject, r.semester, r.unit, r.academic_year,
      s.created_at AS saved_at,
      (SELECT COUNT(*)::int FROM likes l WHERE l.resource_id = r.id) AS like_count,
      (SELECT COUNT(*)::int FROM transactions t
         WHERE t.resource_id = r.id AND t.type = 'SPEND') AS download_count,
      (SELECT ROUND(AVG(value)::numeric, 1)::float8 FROM ratings rt
         WHERE rt.resource_id = r.id) AS rating_avg,
      (SELECT COUNT(*)::int FROM ratings rt WHERE rt.resource_id = r.id) AS rating_count
    FROM saved_resources s
    JOIN resources r ON r.id = s.resource_id
    WHERE s.user_id = ${userId} AND r.status = 'ACTIVE'
    ORDER BY s.created_at DESC, r.id
    LIMIT ${limit}::int OFFSET ${offset}::int
  `;

  const countRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM saved_resources s
    JOIN resources r ON r.id = s.resource_id
    WHERE s.user_id = ${userId} AND r.status = 'ACTIVE'
  `;

  return {
    results: rows.map((r) => ({ ...r, size_bytes: r.size_bytes.toString() })),
    total: countRows[0].total,
    page: Number(page),
    limit: Number(limit),
  };
}

module.exports = { saveResource, unsaveResource, listSaved };