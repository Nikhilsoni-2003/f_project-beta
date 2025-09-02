const { v4: uuidv4 } = require('uuid');
const dynamodb = require('../../utils/dynamodb');
const cognito = require('../../utils/cognito');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

exports.handler = async (event) => {
  const { httpMethod, path, body } = event;
  const parsedBody = body ? JSON.parse(body) : {};
  
  try {
    switch (true) {
      case httpMethod === 'POST' && path === '/api/auth/signup':
        return await signUp(parsedBody);
      case httpMethod === 'POST' && path === '/api/auth/signin':
        return await signIn(parsedBody);
      case httpMethod === 'GET' && path === '/api/auth/signout':
        return await signOut();
      case httpMethod === 'POST' && path === '/api/auth/forgot-password':
        return await forgotPassword(parsedBody);
      case httpMethod === 'POST' && path === '/api/auth/reset-password':
        return await resetPassword(parsedBody);
      default:
        return createErrorResponse(404, 'Route not found');
    }
  } catch (error) {
    console.error('Auth Handler Error:', error);
    return createErrorResponse(500, error.message);
  }
};

const signUp = async ({ name, userName, email, password }) => {
  try {
    // Check if user already exists
    const existingUserByEmail = await dynamodb.query(
      process.env.USERS_TABLE,
      'email = :email',
      { ':email': email },
      'email-index'
    );

    if (existingUserByEmail.length > 0) {
      return createErrorResponse(400, 'User with this email already exists');
    }

    const existingUserByUserName = await dynamodb.query(
      process.env.USERS_TABLE,
      'userName = :userName',
      { ':userName': userName },
      'userName-index'
    );

    if (existingUserByUserName.length > 0) {
      return createErrorResponse(400, 'Username already taken');
    }

    // Create user in Cognito
    await cognito.signUp(email, password, userName, name);

    // Sign in to get tokens
    const tokens = await cognito.signIn(email, password);

    // Create user in DynamoDB
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
    // Find user by userName
    const users = await dynamodb.query(
      process.env.USERS_TABLE,
      'userName = :userName',
      { ':userName': userName },
      'userName-index'
    );

    if (users.length === 0) {
      return createErrorResponse(400, 'User not found');
    }

    const user = users[0];

    // Sign in with Cognito
    const tokens = await cognito.signIn(user.email, password);

    return createSuccessResponse({ user, tokens });
  } catch (error) {
    console.error('SignIn Error:', error);
    return createErrorResponse(400, 'Invalid credentials');
  }
};

const signOut = async () => {
  return createSuccessResponse({ message: 'Signed out successfully' });
};

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