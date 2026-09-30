const prisma = require('../prisma/client');

async function awardUploadCredits(tx, userId, resourceId, amount) {
  await tx.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
  await tx.transaction.create({
    data: { userId, resourceId, type: 'EARN', amount },
  });
}

module.exports = { awardUploadCredits };