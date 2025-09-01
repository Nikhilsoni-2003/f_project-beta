const s3 = require('../../utils/s3');
const { extractUserFromToken } = require('../../utils/auth');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

exports.handler = async (event) => {
  const { httpMethod, path, body } = event;
  const parsedBody = body ? JSON.parse(body) : {};

  try {
    const currentUser = await extractUserFromToken(event);

    switch (true) {
      case httpMethod === 'POST' && path === '/api/media/presigned-url':
        return await getPresignedUrl(currentUser, parsedBody);
      default:
        return createErrorResponse(404, 'Route not found');
    }
  } catch (error) {
    console.error('Media Handler Error:', error);
    return createErrorResponse(500, error.message);
  }
};

const getPresignedUrl = async (currentUser, { fileName, contentType, uploadType }) => {
  try {
    const key = s3.generateFileKey(currentUser.userId, uploadType, fileName);
    const { presignedUrl, fileUrl } = await s3.generatePresignedUrl(key, contentType);

    return createSuccessResponse({
      presignedUrl,
      fileUrl,
      key
    });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};