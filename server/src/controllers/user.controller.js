const prisma = require('../prisma/client');

async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, credits: true, role: true },
    });
    res.json(user);
  } catch (err) { next(err); }
}
async function getMyTransactions(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: req.user.id },
        include: { resource: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.transaction.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      results: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        resourceTitle: t.resource?.title || null,
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (err) { next(err); }
}

module.exports = { getMe, getMyTransactions };

