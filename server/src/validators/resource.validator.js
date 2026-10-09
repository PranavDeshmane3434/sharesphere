const { z } = require('zod');
const { ALLOWED_TYPES, MAX_FILE_SIZE_BYTES, SORT_SQL } = require('../config/constants');

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

const reportSchema = z.object({
  reason: z.string().min(5).max(500),
});

const resolveReportSchema = z.object({
  decision: z.enum(['DISMISS', 'HIDE', 'REMOVE']),
});

const setStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'HIDDEN', 'REMOVED']),
});

const listQuerySchema = z.object({
  q: z.string().max(200).optional(),
  type: z.enum(ALLOWED_TYPES).optional(),
  sort: z.enum(Object.keys(SORT_SQL)).optional(), // exactly one key, anything else is a 400
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

module.exports = {
  uploadUrlSchema,
  confirmSchema,
  reportSchema,
  resolveReportSchema,
  setStatusSchema,
  listQuerySchema,
};