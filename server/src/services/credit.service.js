const prisma = require('../prisma/client');

class InsufficientCreditsError extends Error {
  constructor() {
    super('Insufficient credits');
    this.status = 402;
    this.code = 'INSUFFICIENT_CREDITS';
  }
}

async function awardUploadCredits(tx, userId, resourceId, amount) {
  await tx.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
  await tx.transaction.create({
    data: { userId, resourceId, type: 'EARN', amount },
  });
}

async function deductDownloadCredits(userId, resourceId, amount) {
  return prisma.$transaction(async (tx) => {
    // Row lock: no other transaction can read/write this user's row until this one commits.
    // This is what makes "no double-spend under concurrency" actually true, not just a schema claim.
    const rows = await tx.$queryRaw`
      SELECT credits FROM "users" WHERE id = ${userId} FOR UPDATE
    `;

    if (!rows[0]) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (rows[0].credits < amount) {
      throw new InsufficientCreditsError();
    }

    await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
    });

    await tx.transaction.create({
      data: { userId, resourceId, type: 'SPEND', amount },
    });
  });
}

module.exports = { awardUploadCredits, deductDownloadCredits, InsufficientCreditsError };