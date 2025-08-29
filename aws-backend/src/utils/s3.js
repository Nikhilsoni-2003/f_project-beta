const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-north-1' });

class S3Service {
  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME;
    this.cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
  }

  async generatePresignedUrl(key, contentType, expiresIn = 3600) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType
      });

      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
      const fileUrl = `https://${this.cloudFrontDomain}/${key}`;

      return {
        presignedUrl,
        fileUrl,
        key
      };
    } catch (error) {
      console.error('S3 Presigned URL Error:', error);
      throw error;
    }
  }

  generateFileKey(userId, type, fileName) {
    const timestamp = Date.now();
    const extension = fileName.split('.').pop();
    return `${type}/${userId}/${timestamp}.${extension}`;
  }
}

module.exports = new S3Service();