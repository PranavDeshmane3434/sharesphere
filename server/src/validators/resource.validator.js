const { z } = require('zod');
const { ALLOWED_TYPES, MAX_FILE_SIZE_BYTES } = require('../config/constants');

const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  type: z.enum(ALLOWED_TYPES),
});

const confirmSchema = z.object({
  uploadId: z.string().uuid(),
  objectKey: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  type: z.enum(ALLOWED_TYPES),
});

module.exports = { uploadUrlSchema, confirmSchema };