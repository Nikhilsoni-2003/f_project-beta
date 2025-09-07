const createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers
    },
    body: JSON.stringify(body)
  };
};

const createErrorResponse = (statusCode, message) => {
  return createResponse(statusCode, { error: true, message });
};

const createSuccessResponse = (data) => {
  return createResponse(200, data);
};

module.exports = {
  createResponse,
  createErrorResponse,
  createSuccessResponse
};