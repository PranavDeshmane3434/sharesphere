const crypto = require("crypto");
const prisma = require("../prisma/client");
const storage = require("./storage.service");
const creditService = require("./credit.service");
const { UPLOAD_REWARD, MAX_FILE_SIZE_BYTES } = require("../config/constants");
const { DOWNLOAD_COST } = require("../config/constants");
const SORT_MAP = {
  newest: "r.created_at DESC",
  oldest: "r.created_at ASC",
  size_asc: "r.size_bytes ASC",
  size_desc: "r.size_bytes DESC",
  most_liked: "like_count DESC",
  most_downloaded: "download_count DESC",
};

async function listResources({ q, type, sort, page = 1, limit = 20 }, userId) {
  const offset = (page - 1) * limit;
  const conditions = [`r.status = 'ACTIVE'`];
  const params = [];

  if (type) {
    params.push(type);
    conditions.push(`r.type = $${params.length}`);
  }
  if (q) {
    params.push(q);
    conditions.push(
      `r.search_vector @@ plainto_tsquery('english', $${params.length})`,
    );
  }

  const whereClause = conditions.join(" AND ");

  const sortTokens = (sort || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let orderClause;
  if (q && sortTokens.length === 0) {
    orderClause = `ORDER BY ts_rank(r.search_vector, plainto_tsquery('english', $${params.indexOf(q) + 1})) DESC`;
  } else {
    const validSorts = sortTokens.map((s) => SORT_MAP[s]).filter(Boolean);
    orderClause =
      validSorts.length > 0
        ? `ORDER BY ${validSorts.join(", ")}`
        : `ORDER BY r.created_at DESC`;
  }

  params.push(userId);
  const userIdIdx = params.length;
  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       r.id, r.title, r.description, r.type, r.size_bytes, r.status, r.created_at,
       COUNT(DISTINCT l.user_id)::int AS like_count,
       COUNT(DISTINCT t.id)::int AS download_count,
       BOOL_OR(l.user_id = $${userIdIdx}) AS liked_by_me
     FROM resources r
     LEFT JOIN likes l ON l.resource_id = r.id
     LEFT JOIN transactions t ON t.resource_id = r.id AND t.type = 'SPEND'
     WHERE ${whereClause}
     GROUP BY r.id
     ${orderClause}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    ...params,
  );

  const countRows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS total FROM resources r WHERE ${whereClause}`,
    ...params.slice(0, params.length - 3),
  );

  return {
    results: rows.map((r) => ({
      ...r,
      size_bytes: r.size_bytes.toString(),
      liked_by_me: !!r.liked_by_me,
    })),
    total: countRows[0].total,
    page: Number(page),
    limit: Number(limit),
  };
}


async function downloadResource(userId, resourceId) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });

  if (!resource || resource.status !== "ACTIVE") {
    const err = new Error("Resource not found");
    err.status = 404;
    throw err;
  }

  // Deduct credits — locked, atomic, commits before we touch storage
  await creditService.deductDownloadCredits(userId, resourceId, DOWNLOAD_COST);

  // Signed URL generated AFTER the transaction commits — never hold a DB lock during network I/O
  const downloadUrl = await storage.getPresignedGetUrl(resource.objectKey);

  return { downloadUrl, title: resource.title };
}

async function createUploadUrl(
  userId,
  { filename, contentType, sizeBytes, type },
) {
  const uploadId = crypto.randomUUID();
  const objectKey = storage.buildObjectKey(userId, uploadId, filename);
  const presignedPutUrl = await storage.getPresignedPutUrl(
    objectKey,
    contentType,
  );

  return { uploadId, objectKey, presignedPutUrl, sizeBytes, type };
}

async function confirmUpload(
  userId,
  { uploadId, objectKey, title, description, type },
) {
  // Ownership check: the object key must belong to this user + this uploadId
  const expectedPrefix = `uploads/${userId}/${uploadId}/`;
  if (!objectKey.startsWith(expectedPrefix)) {
    const err = new Error("Object key does not match user/upload");
    err.status = 403;
    throw err;
  }

  // check upload file type
  const EXTENSION_MAP = {
    PDF: [".pdf"],
    PPT: [".ppt"],
    PPTX: [".pptx"],
    DOC: [".doc"],
    DOCX: [".docx"],
    TXT: [".txt"],
  };

  function extensionMatchesType(objectKey, type) {
    const ext = objectKey.slice(objectKey.lastIndexOf(".")).toLowerCase();
    return EXTENSION_MAP[type]?.includes(ext) ?? false;
  }

  // Verify the file actually exists in R2, and trust R2's size, not the client's
  const head = await storage.headObject(objectKey);
  if (!head.exists) {
    const err = new Error("File not found in storage — upload may have failed");
    err.status = 400;
    throw err;
  }
  if (head.sizeBytes > MAX_FILE_SIZE_BYTES) {
    const err = new Error("File exceeds maximum allowed size");
    err.status = 400;
    throw err;
  }

  if (!extensionMatchesType(objectKey, type)) {
    const err = new Error("File extension does not match declared type");
    err.status = 400;
    throw err;
  }

  try {
    const resource = await prisma.$transaction(async (tx) => {
      const created = await tx.resource.create({
        data: {
          uploadId,
          uploaderId: userId,
          title,
          description,
          type,
          sizeBytes: head.sizeBytes,
          objectKey,
        },
      });

      await creditService.awardUploadCredits(
        tx,
        userId,
        created.id,
        UPLOAD_REWARD,
      );

      return created;
    });

    return { resource, alreadyConfirmed: false };
  } catch (err) {
    // Unique constraint on upload_id means this was already confirmed — idempotent no-op
    if (err.code === "P2002" && err.meta?.target?.includes("upload_id")) {
      const existing = await prisma.resource.findUnique({
        where: { uploadId },
      });
      return { resource: existing, alreadyConfirmed: true };
    }
    throw err;
  }
}



async function listModeratedResources() {
  return prisma.resource.findMany({
    where: { status: { in: ["HIDDEN", "REMOVED"] } },
    include: { uploader: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function setResourceStatus(resourceId, status) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });
  if (!resource) {
    const err = new Error("Resource not found");
    err.status = 404;
    throw err;
  }

  if (resource.status === "REMOVED" && status === "ACTIVE") {
    const err = new Error("Removed resources cannot be restored");
    err.status = 409;
    throw err;
  }

  return prisma.resource.update({
    where: { id: resourceId },
    data: { status },
  });
}

module.exports = {
  createUploadUrl,
  confirmUpload,
  downloadResource,
  listResources,
  listModeratedResources,
  setResourceStatus,
};
