module.exports = {
  UPLOAD_REWARD: 5,
  DOWNLOAD_COST: 2,
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024,
  ALLOWED_TYPES: ['PDF', 'PPT', 'PPTX', 'DOC', 'DOCX', 'TXT'],

  // Must match the ResourceCategory enum in schema.prisma
  CATEGORIES: [
    'NOTES',
    'QUESTION_PAPER',
    'ASSIGNMENT',
    'LAB_MANUAL',
    'PPT',
    'SOLVED_PAPER',
    'REFERENCE_MATERIAL',
  ],
  MAX_SEMESTER: 8,
  MAX_UNIT: 10,

  // Single source of truth for sorting. The validator accepts only these keys,
  // and the service maps each key to a fixed SQL fragment.
  // rating_avg / rating_count / like_count / download_count are output aliases of the listing query.
  SORT_SQL: {
    newest: 'r.created_at DESC, r.id',
    oldest: 'r.created_at ASC, r.id',
    size_asc: 'r.size_bytes ASC, r.id',
    size_desc: 'r.size_bytes DESC, r.id',
    most_liked: 'like_count DESC, r.created_at DESC, r.id',
    most_downloaded: 'download_count DESC, r.created_at DESC, r.id',
    highest_rated: 'rating_avg DESC NULLS LAST, rating_count DESC, r.created_at DESC, r.id',
  },
};