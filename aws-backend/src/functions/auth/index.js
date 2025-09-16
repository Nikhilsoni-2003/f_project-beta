// const { v4: uuidv4 } = require('uuid');
// const dynamodb = require('../../utils/dynamodb');
// const cognito = require('../../utils/cognito');
// const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

// exports.handler = async (event) => {
//   const { httpMethod, path, body } = event;
//   const parsedBody = body ? JSON.parse(body) : {};
  
//   if (httpMethod === 'OPTIONS') {
//     return {
//       statusCode: 200,
//       headers: {
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
//         'Access-Control-Allow-Headers': 'Content-Type, Authorization'
//       },
//       body: JSON.stringify({ message: 'CORS preflight OK' })
//     };
//   }

//   try {
//     switch (true) {
//       case httpMethod === 'POST' && path === '/api/auth/signup':
//         return await signUp(parsedBody);
//       case httpMethod === 'POST' && path === '/api/auth/signin':
//         return await signIn(parsedBody);
//       case httpMethod === 'GET' && path === '/api/auth/signout':
//         return await signOut();
//       case httpMethod === 'POST' && path === '/api/auth/forgot-password':
//         return await forgotPassword(parsedBody);
//       case httpMethod === 'POST' && path === '/api/auth/reset-password':
//         return await resetPassword(parsedBody);
//       default:
//         return createErrorResponse(404, 'Route not found');
//     }
//   } catch (error) {
//     console.error('Auth Handler Error:', error);
//     return createErrorResponse(500, error.message);
//   }
// };

// const signUp = async ({ name, userName, email, password }) => {
//   try {
//     // Check if user already exists
//     const existingUserByEmail = await dynamodb.query(
//       process.env.USERS_TABLE,
//       'email = :email',
//       { ':email': email },
//       'email-index'
//     );

//     if (existingUserByEmail.length > 0) {
//       return createErrorResponse(400, 'User with this email already exists');
//     }

//     const existingUserByUserName = await dynamodb.query(
//       process.env.USERS_TABLE,
//       'userName = :userName',
//       { ':userName': userName },
//       'userName-index'
//     );

//     if (existingUserByUserName.length > 0) {
//       return createErrorResponse(400, 'Username already taken');
//     }

//     // Create user in Cognito
//     await cognito.signUp(email, password, userName, name);

//     // Sign in to get tokens
//     const tokens = await cognito.signIn(email, password);

//     // Create user in DynamoDB
//     const userId = uuidv4();
//     const user = {
//       userId,
//       email,
//       userName,
//       name,
//       profileImage: '',
//       bio: '',
//       profession: '',
//       gender: '',
//       followers: [],
//       following: [],
//       posts: [],
//       saved: [],
//       story: null,
//       createdAt: Date.now()
//     };

//     await dynamodb.put(process.env.USERS_TABLE, user);

//     return createSuccessResponse({ user, tokens });
//   } catch (error) {
//     console.error('SignUp Error:', error);
//     return createErrorResponse(400, error.message);
//   }
// };

// const signIn = async ({ userName, password }) => {
//   try {
//     // Find user by userName
//     const users = await dynamodb.query(
//       process.env.USERS_TABLE,
//       'userName = :userName',
//       { ':userName': userName },
//       'userName-index'
//     );

//     if (users.length === 0) {
//       return createErrorResponse(400, 'User not found');
//     }

//     const user = users[0];

//     // Sign in with Cognito
//     const tokens = await cognito.signIn(user.email, password);

//     return createSuccessResponse({ user, tokens });
//   } catch (error) {
//     console.error('SignIn Error:', error);
//     return createErrorResponse(400, 'Invalid credentials');
//   }
// };

// const signOut = async () => {
//   return createSuccessResponse({ message: 'Signed out successfully' });
// };

// const forgotPassword = async ({ email }) => {
//   try {
//     await cognito.forgotPassword(email);
//     return createSuccessResponse({ message: 'Password reset code sent to email' });
//   } catch (error) {
//     console.error('ForgotPassword Error:', error);
//     return createErrorResponse(400, error.message);
//   }
// };

// const resetPassword = async ({ email, confirmationCode, password }) => {
//   try {
//     await cognito.resetPassword(email, confirmationCode, password);
//     return createSuccessResponse({ message: 'Password reset successfully' });
//   } catch (error) {
//     console.error('ResetPassword Error:', error);
//     return createErrorResponse(400, error.message);
//   }
// };
const { v4: uuidv4 } = require('uuid');
const dynamodb = require('../../utils/dynamodb');
const cognito = require('../../utils/cognito');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

const allowedOrigins = [
  'http://localhost:5173',
  'https://dsvtq5o5a0ykh.cloudfront.net'
];

const getCorsHeaders = (origin) => {
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };
};

exports.handler = async (event) => {
  const { httpMethod, path, body } = event;
  const parsedBody = body ? JSON.parse(body) : {};
  const origin = event.headers?.origin || event.headers?.Origin || 'http://localhost:5173';

  // Handle OPTIONS (preflight)
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ message: 'CORS preflight OK' })
    };
  }

  try {
    let response;
    switch (true) {
      case httpMethod === 'POST' && path === '/api/auth/signup':
        response = await signUp(parsedBody);
        break;
      case httpMethod === 'POST' && path === '/api/auth/signin':
        response = await signIn(parsedBody);
        break;
      case httpMethod === 'GET' && path === '/api/auth/signout':
        response = await signOut();
        break;
      case httpMethod === 'POST' && path === '/api/auth/forgot-password':
        response = await forgotPassword(parsedBody);
        break;
      case httpMethod === 'POST' && path === '/api/auth/reset-password':
        response = await resetPassword(parsedBody);
        break;
      default:
        response = createErrorResponse(404, 'Route not found');
    }

    // Attach CORS headers
    response.headers = {
      ...(response.headers || {}),
      ...getCorsHeaders(origin)
    };

    return response;
  } catch (error) {
    console.error('Auth Handler Error:', error);
    const errorResponse = createErrorResponse(500, error.message);
    errorResponse.headers = getCorsHeaders(origin);
    return errorResponse;
  }
};

// -------------------- Auth Functions --------------------

const signUp = async ({ name, userName, email, password }) => {
  try {
    const existingUserByEmail = await dynamodb.query(
      process.env.USERS_TABLE,
      'email = :email',
      { ':email': email },
      'email-index'
    );
    if (existingUserByEmail.length > 0) return createErrorResponse(400, 'User with this email already exists');

    const existingUserByUserName = await dynamodb.query(
      process.env.USERS_TABLE,
      'userName = :userName',
      { ':userName': userName },
      'userName-index'
    );
    if (existingUserByUserName.length > 0) return createErrorResponse(400, 'Username already taken');

    await cognito.signUp(email, password, userName, name);
    const tokens = await cognito.signIn(email, password);

    const userId = uuidv4();
    const user = {
      userId,
      email,
      userName,
      name,
      profileImage: '',
      bio: '',
      profession: '',
      gender: '',
      followers: [],
      following: [],
      posts: [],
      saved: [],
      story: null,
      createdAt: Date.now()
    };

    await dynamodb.put(process.env.USERS_TABLE, user);

    return createSuccessResponse({ user, tokens });
  } catch (error) {
    console.error('SignUp Error:', error);
    return createErrorResponse(400, error.message);
  }
};

const signIn = async ({ userName, password }) => {
  try {
    const users = await dynamodb.query(
      process.env.USERS_TABLE,
      'userName = :userName',
      { ':userName': userName },
      'userName-index'
    );
    if (users.length === 0) return createErrorResponse(400, 'User not found');

    const user = users[0];
    const tokens = await cognito.signIn(user.email, password);

    return createSuccessResponse({ user, tokens });
  } catch (error) {
    console.error('SignIn Error:', error);
    return createErrorResponse(400, 'Invalid credentials');
  }
};

const signOut = async () => createSuccessResponse({ message: 'Signed out successfully' });

const forgotPassword = async ({ email }) => {
  try {
    await cognito.forgotPassword(email);
    return createSuccessResponse({ message: 'Password reset code sent to email' });
  } catch (error) {
    console.error('ForgotPassword Error:', error);
    return createErrorResponse(400, error.message);
  }
};

const resetPassword = async ({ email, confirmationCode, password }) => {
  try {
    await cognito.resetPassword(email, confirmationCode, password);
    return createSuccessResponse({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('ResetPassword Error:', error);
    return createErrorResponse(400, error.message);
  }
};
