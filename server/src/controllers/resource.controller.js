const resourceService = require('../services/resource.service');
const likeService = require('../services/like.service');
const reportService = require('../services/report.service');
const {
  uploadUrlSchema,
  confirmSchema,
  reportSchema,
  listQuerySchema,
} = require('../validators/resource.validator');

async function getUploadUrl(req, res, next) {
  try {
    const data = uploadUrlSchema.parse(req.body);
    const result = await resourceService.createUploadUrl(req.user.id, data);
    res.json(result);
  } catch (err) { next(err); }
}

async function confirmUpload(req, res, next) {
  try {
    const data = confirmSchema.parse(req.body);
    const result = await resourceService.confirmUpload(req.user.id, data);
    res.status(result.alreadyConfirmed ? 200 : 201).json(result.resource);
  } catch (err) { next(err); }
}

async function downloadResource(req, res, next) {
  try {
    const result = await resourceService.downloadResource(req.user.id, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

async function like(req, res, next) {
  try {
    res.json(await likeService.likeResource(req.user.id, req.params.id));
  } catch (err) { next(err); }
}

async function unlike(req, res, next) {
  try {
    res.json(await likeService.unlikeResource(req.user.id, req.params.id));
  } catch (err) { next(err); }
}

async function report(req, res, next) {
  try {
    const { reason } = reportSchema.parse(req.body);
    const result = await reportService.createReport(req.user.id, req.params.id, reason);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function listResources(req, res, next) {
  try {
    const query = listQuerySchema.parse(req.query);
    res.json(await resourceService.listResources(query, req.user.id));
  } catch (err) { next(err); }
}

async function getResource(req, res, next) {
  try {
    res.json(await resourceService.getResourceDetails(req.params.id, req.user.id));
  } catch (err) { next(err); }
}

async function getFilterOptions(req, res, next) {
  try {
    res.json(await resourceService.getFilterOptions());
  } catch (err) { next(err); }
}

module.exports = {
  getUploadUrl,
  confirmUpload,
  downloadResource,
  like,
  unlike,
  report,
  listResources,
  getResource,
  getFilterOptions,
};