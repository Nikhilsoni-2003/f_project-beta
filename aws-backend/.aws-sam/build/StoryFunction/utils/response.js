const createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
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