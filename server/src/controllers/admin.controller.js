const reportService = require('../services/report.service');
const { resolveReportSchema } = require('../validators/resource.validator');

async function listReports(req, res, next) {
  try {
    const reports = await reportService.listReports(req.query.status);
    res.json(reports);
  } catch (err) { next(err); }
}

async function resolveReport(req, res, next) {
  try {
    const { decision } = resolveReportSchema.parse(req.body);
    const result = await reportService.resolveReport(req.params.id, req.user.id, decision);
    res.json(result);
  } catch (err) { next(err); }
}

module.exports = { listReports, resolveReport };