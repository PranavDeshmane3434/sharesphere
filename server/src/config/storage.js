const { S3Client } = require('@aws-sdk/client-s3');

const storageClient = new S3Client({
  region: 'auto',
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  forcePathStyle: true, // B2's S3-compatible API needs path-style requests
});

module.exports = storageClient;