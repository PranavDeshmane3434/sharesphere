const reportService = require("../services/report.service");
const { resolveReportSchema } = require("../validators/resource.validator");
const resourceService = require("../services/resource.service");
const { setStatusSchema } = require("../validators/resource.validator");

async function listModeratedResources(req, res, next) {
  try {
    const resources = await resourceService.listModeratedResources();
    res.json(resources);
  } catch (err) {
    next(err);
  }
}

async function setResourceStatus(req, res, next) {
  try {
    const { status } = setStatusSchema.parse(req.body);
    const resource = await resourceService.setResourceStatus(
      req.params.id,
      status,
    );
    res.json(resource);
  } catch (err) {
    next(err);
  }
}

async function listReports(req, res, next) {
  try {
    const reports = await reportService.listReports(req.query.status);
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

async function resolveReport(req, res, next) {
  try {
    const { decision } = resolveReportSchema.parse(req.body);
    const result = await reportService.resolveReport(
      req.params.id,
      req.user.id,
      decision,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listReports,
  resolveReport,
  listModeratedResources,
  setResourceStatus,
};
