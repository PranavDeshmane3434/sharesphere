export const FILE_TYPES = ['PDF', 'PPT', 'PPTX', 'DOC', 'DOCX', 'TXT'];

export const CATEGORIES = [
  { value: 'NOTES', label: 'Notes' },
  { value: 'QUESTION_PAPER', label: 'Question paper' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'LAB_MANUAL', label: 'Lab manual' },
  { value: 'PPT', label: 'Presentation' },
  { value: 'SOLVED_PAPER', label: 'Solved paper' },
  { value: 'REFERENCE_MATERIAL', label: 'Reference material' },
];

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
export const UNITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// "notes.PDF" -> "PDF", unsupported or no extension -> null
export function detectFileType(filename) {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = filename.slice(dot + 1).toUpperCase();
  return FILE_TYPES.includes(ext) ? ext : null;
}

// Academic year starts around July: Oct 2026 -> "2026-27", Mar 2026 -> "2025-26"
export function academicYearOptions(now = new Date()) {
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const options = [];
  for (let y = start + 1; y >= start - 4; y--) {
    options.push(`${y}-${String((y + 1) % 100).padStart(2, '0')}`);
  }
  return options;
}
export function formatSize(bytes) {
  const n = Number(bytes);

  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;

  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
