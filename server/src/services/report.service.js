const prisma = require("../prisma/client");

async function createReport(reporterId, resourceId, reason) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });
  if (!resource) {
    const err = new Error("Resource not found");
    err.status = 404;
    throw err;
  }

  if (resource.uploaderId === reporterId) {
    const err = new Error("You cannot report your own resource");
    err.status = 403;
    throw err;
  }

  try {
    const report = await prisma.report.create({
      data: { reporterId, resourceId, reason },
    });
    return report;
  } catch (err) {
    if (err.code === "P2002") {
      const e = new Error("You have already reported this resource");
      e.status = 409;
      throw e;
    }
    throw err;
  }
}

async function listReports(status) {
  return prisma.report.findMany({
    where: status ? { status } : undefined,
    include: {
      resource: true,
      reporter: { select: { id: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function resolveReport(reportId, adminId, decision) {
  // decision: 'DISMISS' | 'HIDE' | 'REMOVE'
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) {
    const err = new Error("Report not found");
    err.status = 404;
    throw err;
  }
  if (report.status !== "PENDING") {
    const err = new Error("Report already resolved");
    err.status = 409;
    throw err;
  }

  const reportStatus = decision === "DISMISS" ? "DISMISSED" : "ACTION_TAKEN";

  return prisma.$transaction(async (tx) => {
    const updatedReport = await tx.report.update({
      where: { id: reportId },
      data: {
        status: reportStatus,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    if (decision === "HIDE" || decision === "REMOVE") {
      await tx.resource.update({
        where: { id: report.resourceId },
        data: { status: decision === "HIDE" ? "HIDDEN" : "REMOVED" },
      });
    }

    return updatedReport;
  });
}

module.exports = { createReport, listReports, resolveReport };
