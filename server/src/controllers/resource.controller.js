const resourceService = require('../services/resource.service');
const { uploadUrlSchema, confirmSchema } = require('../validators/resource.validator');
const likeService = require('../services/like.service');
const { reportSchema } = require('../validators/resource.validator');
const reportService = require('../services/report.service');
const { listQuerySchema } = require('../validators/resource.validator');


// Get url to upload
async function getUploadUrl(req, res, next) {
  try {
    const data = uploadUrlSchema.parse(req.body);
    const result = await resourceService.createUploadUrl(req.user.id, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Upload Conmfirmation
async function confirmUpload(req, res, next) {
  try {
    const data = confirmSchema.parse(req.body);
    const result = await resourceService.confirmUpload(req.user.id, data);
    res.status(result.alreadyConfirmed ? 200 : 201).json(result.resource);
  } catch (err) {
    next(err);
  }
}

// download
async function downloadResource(req, res, next) {
  try {
    const result = await resourceService.downloadResource(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// LIKE - Unlike
async function like(req, res, next) {
  try {
    const result = await likeService.likeResource(req.user.id, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

async function unlike(req, res, next) {
  try {
    const result = await likeService.unlikeResource(req.user.id, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

// Report
async function report(req, res, next) {
  try {
    const { reason } = reportSchema.parse(req.body);
    const result = await reportService.createReport(req.user.id, req.params.id, reason);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

// Search result
async function listResources(req, res, next) {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await resourceService.listResources(query);
    res.json(result);
  } catch (err) { next(err); }
}

module.exports = { getUploadUrl, confirmUpload, downloadResource, like, unlike, report, listResources };
