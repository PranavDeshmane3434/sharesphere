const { z } = require('zod');
const {
  ALLOWED_TYPES,
  MAX_FILE_SIZE_BYTES,
  SORT_SQL,
  CATEGORIES,
  MAX_SEMESTER,
  MAX_UNIT,
} = require('../config/constants');

// Empty strings from forms/query strings count as "not provided"
const blankToUndefined = (v) => (v === '' || v === null ? undefined : v);
const optional = (schema) => z.preprocess(blankToUndefined, schema.optional());

const subjectSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .transform((s) => s.replace(/\s+/g, ' '));

const semesterSchema = z.coerce.number().int().min(1).max(MAX_SEMESTER);
const unitSchema = z.coerce.number().int().min(1).max(MAX_UNIT);

const academicYearSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Academic year must look like 2026-27')
  .refine((v) => {
    const start = Number(v.slice(0, 4));
    const end = Number(v.slice(5));
    return start >= 2000 && start <= 2100 && (start + 1) % 100 === end;
  }, 'Academic year must be consecutive years, e.g. 2026-27');

const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  type: z.enum(ALLOWED_TYPES),
});

const confirmSchema = z.object({
  uploadId: z.string().uuid(),
  objectKey: z.string().min(1),
  title: z.string().trim().min(1).max(255),
  description: z.string().max(2000).optional(),
  type: z.enum(ALLOWED_TYPES),
  category: z.enum(CATEGORIES),
  subject: optional(subjectSchema),
  semester: optional(semesterSchema),
  unit: optional(unitSchema),
  academicYear: optional(academicYearSchema),
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
  type: optional(z.enum(ALLOWED_TYPES)),
  category: optional(z.enum(CATEGORIES)),
  subject: optional(subjectSchema),
  semester: optional(semesterSchema),
  unit: optional(unitSchema),
  academicYear: optional(academicYearSchema),
  sort: z.enum(Object.keys(SORT_SQL)).optional(),
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