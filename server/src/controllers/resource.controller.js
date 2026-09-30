const resourceService = require('../services/resource.service');
const { uploadUrlSchema, confirmSchema } = require('../validators/resource.validator');

async function getUploadUrl(req, res, next) {
  try {
    const data = uploadUrlSchema.parse(req.body);
    const result = await resourceService.createUploadUrl(req.user.id, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function confirmUpload(req, res, next) {
  try {
    const data = confirmSchema.parse(req.body);
    const result = await resourceService.confirmUpload(req.user.id, data);
    res.status(result.alreadyConfirmed ? 200 : 201).json(result.resource);
  } catch (err) {
    next(err);
  }
}

module.exports = { getUploadUrl, confirmUpload };