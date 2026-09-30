const { PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const storageClient = require('../config/storage');

const BUCKET = process.env.B2_BUCKET;

function buildObjectKey(userId, uploadId, filename) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `uploads/${userId}/${uploadId}/${safeName}`;
}

async function getPresignedPutUrl(objectKey, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
    ContentType: contentType,
  });
  return getSignedUrl(storageClient, command, { expiresIn: 300 }); // 5 min
}

async function getPresignedGetUrl(objectKey) {
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: objectKey });
  return getSignedUrl(storageClient, command, { expiresIn: 60 }); // 60 sec
}

async function headObject(objectKey) {
  try {
    const result = await storageClient.send(new HeadObjectCommand({ Bucket: BUCKET, Key: objectKey }));
    return { exists: true, sizeBytes: result.ContentLength };
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw err;
  }
}

module.exports = { buildObjectKey, getPresignedPutUrl, getPresignedGetUrl, headObject };