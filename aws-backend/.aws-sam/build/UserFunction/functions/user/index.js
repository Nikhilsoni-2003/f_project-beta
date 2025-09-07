const { v4: uuidv4 } = require('uuid');
const dynamodb = require('../../utils/dynamodb');
const s3 = require('../../utils/s3');
const { extractUserFromToken } = require('../../utils/auth');
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
  const { httpMethod, path, pathParameters, queryStringParameters, body } = event;
  const parsedBody = body ? JSON.parse(body) : {};
  const origin = headers?.origin || headers?.Origin || 'http://localhost:5173';

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
      case httpMethod === 'GET' && path === '/api/user/current':
        response = await getCurrentUser(currentUser);
        break;
      case httpMethod === 'GET' && path.includes('/api/user/getProfile/'):
        response = await getProfile(pathParameters.userName);
        break;
      case httpMethod === 'POST' && path === '/api/user/editProfile':
        response = await editProfile(currentUser, parsedBody);
        break;
      case httpMethod === 'GET' && path.includes('/api/user/follow/'):
        response = await followUser(currentUser, pathParameters.userId);
        break;
      case httpMethod === 'GET' && path === '/api/user/suggested':
        response = await getSuggestedUsers(currentUser);
        break;
      case httpMethod === 'GET' && path === '/api/user/search':
        response = await searchUsers(queryStringParameters.keyWord);
        break;
      case httpMethod === 'GET' && path === '/api/user/followingList':
        response = await getFollowingList(currentUser);
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
    console.error('User Handler Error:', error);
    const response = createErrorResponse(500, error.message);
    response.headers = getCorsHeaders(origin);
    return response;
  }
};

const getCurrentUser = async (currentUser) => {
  try {
    const user = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    if (!user) {
      return createErrorResponse(404, 'User not found');
    }
    return createSuccessResponse(user);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const getProfile = async (userName) => {
  try {
    const users = await dynamodb.query(
      process.env.USERS_TABLE,
      'userName = :userName',
      { ':userName': userName },
      'userName-index'
    );

    if (users.length === 0) {
      return createErrorResponse(404, 'User not found');
    }

    const user = users[0];
    
    const posts = await dynamodb.query(
      process.env.POSTS_TABLE,
      'authorId = :authorId',
      { ':authorId': user.userId },
      'author-index'
    );

    const followersData = await Promise.all(
      user.followers.map(async (followerId) => {
        return await dynamodb.get(process.env.USERS_TABLE, { userId: followerId });
      })
    );

    const followingData = await Promise.all(
      user.following.map(async (followingId) => {
        return await dynamodb.get(process.env.USERS_TABLE, { userId: followingId });
      })
    );

    return createSuccessResponse({
      ...user,
      posts,
      followers: followersData.filter(Boolean),
      following: followingData.filter(Boolean)
    });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const editProfile = async (currentUser, { name, userName, bio, profession, gender, profileImageKey }) => {
  try {
    let profileImage = '';
    if (profileImageKey) {
      profileImage = `https://${process.env.CLOUDFRONT_DOMAIN}/${profileImageKey}`;
    }

    const updateExpression = 'SET #name = :name, userName = :userName, bio = :bio, profession = :profession, gender = :gender' +
      (profileImage ? ', profileImage = :profileImage' : '');

    const expressionAttributeValues = {
      ':name': name,
      ':userName': userName,
      ':bio': bio,
      ':profession': profession,
      ':gender': gender
    };

    const expressionAttributeNames = { '#name': 'name' };
    if (profileImage) {
      expressionAttributeValues[':profileImage'] = profileImage;
    }

    const updatedUser = await dynamodb.update(
      process.env.USERS_TABLE,
      { userId: currentUser.userId },
      updateExpression,
      expressionAttributeValues,
      expressionAttributeNames
    );

    return createSuccessResponse(updatedUser);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const followUser = async (currentUser, targetUserId) => {
  try {
    const currentUserData = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    const targetUser = await dynamodb.get(process.env.USERS_TABLE, { userId: targetUserId });

    if (!targetUser) {
      return createErrorResponse(404, 'Target user not found');
    }

    const isFollowing = currentUserData.following.includes(targetUserId);

    if (isFollowing) {
      await dynamodb.update(
        process.env.USERS_TABLE,
        { userId: currentUser.userId },
        'SET following = :following',
        { ':following': currentUserData.following.filter(id => id !== targetUserId) }
      );

      await dynamodb.update(
        process.env.USERS_TABLE,
        { userId: targetUserId },
        'SET followers = :followers',
        { ':followers': targetUser.followers.filter(id => id !== currentUser.userId) }
      );
    } else {
      await dynamodb.update(
        process.env.USERS_TABLE,
        { userId: currentUser.userId },
        'SET following = :following',
        { ':following': [...currentUserData.following, targetUserId] }
      );

      await dynamodb.update(
        process.env.USERS_TABLE,
        { userId: targetUserId },
        'SET followers = :followers',
        { ':followers': [...targetUser.followers, currentUser.userId] }
      );

      const notification = {
        notificationId: uuidv4(),
        receiverId: targetUserId,
        senderId: currentUser.userId,
        type: 'follow',
        message: `${currentUserData.userName} started following you`,
        isRead: false,
        createdAt: Date.now()
      };

      await dynamodb.put(process.env.NOTIFICATIONS_TABLE, notification);
    }

    return createSuccessResponse({ message: isFollowing ? 'Unfollowed' : 'Followed' });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const getSuggestedUsers = async (currentUser) => {
  try {
    const currentUserData = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    const allUsers = await dynamodb.scan(process.env.USERS_TABLE);
    
    const suggestedUsers = allUsers
      .filter(user => 
        user.userId !== currentUser.userId && 
        !currentUserData.following.includes(user.userId)
      )
      .slice(0, 10);

    return createSuccessResponse(suggestedUsers);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const searchUsers = async (keyword) => {
  try {
    const allUsers = await dynamodb.scan(process.env.USERS_TABLE);
    const filteredUsers = allUsers.filter(user => 
      user.userName.toLowerCase().includes(keyword.toLowerCase()) ||
      user.name.toLowerCase().includes(keyword.toLowerCase())
    );

    return createSuccessResponse(filteredUsers);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const getFollowingList = async (currentUser) => {
  try {
    const currentUserData = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    
    const followingData = await Promise.all(
      currentUserData.following.map(async (followingId) => {
        return await dynamodb.get(process.env.USERS_TABLE, { userId: followingId });
      })
    );

    return createSuccessResponse(followingData.filter(Boolean));
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};
