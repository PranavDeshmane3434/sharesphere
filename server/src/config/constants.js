const UPLOAD_REWARD = 5;
const DOWNLOAD_COST = 2;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const ALLOWED_TYPES = ['PDF', 'PPT', 'PPTX', 'DOC', 'DOCX', 'TXT'];

const CATEGORIES = [
  'NOTES',
  'QUESTION_PAPER',
  'ASSIGNMENT',
  'LAB_MANUAL',
  'PPT',
  'SOLVED_PAPER',
  'REFERENCE_MATERIAL',
];

const MAX_SEMESTER = 8;
const MAX_UNIT = 10;

const SORT_SQL = {
  newest: 'r.created_at DESC, r.id',
  oldest: 'r.created_at ASC, r.id',
  size_asc: 'r.size_bytes ASC, r.id',
  size_desc: 'r.size_bytes DESC, r.id',
  most_liked: 'like_count DESC, r.created_at DESC, r.id',
  most_downloaded: 'download_count DESC, r.created_at DESC, r.id',
};


module.exports = {
  UPLOAD_REWARD,
  DOWNLOAD_COST,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_TYPES,
  CATEGORIES,
  MAX_SEMESTER,
  MAX_UNIT,
  SORT_SQL,

};
