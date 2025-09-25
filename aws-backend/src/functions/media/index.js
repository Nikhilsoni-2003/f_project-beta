const s3 = require('../../utils/s3');
const { extractUserFromToken } = require('../../utils/auth');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',
  'https://dsvtq5o5a0ykh.cloudfront.net'
];

const getCorsHeaders = (origin) => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
};

exports.handler = async (event) => {
  const { httpMethod, path, body, headers } = event;
  const parsedBody = body ? JSON.parse(body) : {};
  const origin = event.headers?.origin || event.headers?.Origin || '*';

  // Handle OPTIONS preflight
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ message: 'CORS preflight OK' })
    };
  }

  try {
    const currentUser = await extractUserFromToken(event);
    let response;

    switch (true) {
      case httpMethod === 'POST' && path === '/api/media/presigned-url':
        response = await getPresignedUrl(currentUser, parsedBody);
        break;
      default:
        response = createErrorResponse(404, 'Route not found');
    }

    // Always attach CORS headers
    response.headers = {
      ...(response.headers || {}),
      ...getCorsHeaders(origin)
    };

    return response;
  } catch (error) {
    console.error('Media Handler Error:', error);
    const response = createErrorResponse(500, error.message);
    response.headers = getCorsHeaders(origin);
    return response;
  }
};

// -------------------- Functions --------------------

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
