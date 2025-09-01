const jwt = require('jsonwebtoken');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID,
});

const extractUserFromToken = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await verifier.verify(token);
    
    return {
      userId: payload.sub,
      email: payload.email,
      userName: payload['custom:userName']
    };
  } catch (error) {
    console.error('Auth Error:', error);
    throw new Error('Invalid token');
  }
};

module.exports = {
  extractUserFromToken
};