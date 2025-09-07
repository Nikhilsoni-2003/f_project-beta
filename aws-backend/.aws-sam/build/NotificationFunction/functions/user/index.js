const { v4: uuidv4 } = require('uuid');
const dynamodb = require('../../utils/dynamodb');
const s3 = require('../../utils/s3');
const { extractUserFromToken } = require('../../utils/auth');

// ✅ Common response with CORS
const sendResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify(body),
  };
};

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, queryStringParameters, body } = event;
  const parsedBody = body ? JSON.parse(body) : {};

  if (httpMethod === 'OPTIONS') {
    return sendResponse(200, { message: 'CORS preflight OK' });
  }

  try {
    const currentUser = await extractUserFromToken(event);

    switch (true) {
      case httpMethod === 'GET' && path === '/api/user/current':
        return await getCurrentUser(currentUser);
      case httpMethod === 'GET' && path.includes('/api/user/getProfile/'):
        return await getProfile(pathParameters.userName);
      case httpMethod === 'POST' && path === '/api/user/editProfile':
        return await editProfile(currentUser, parsedBody);
      case httpMethod === 'GET' && path.includes('/api/user/follow/'):
        return await followUser(currentUser, pathParameters.userId);
      case httpMethod === 'GET' && path === '/api/user/suggested':
        return await getSuggestedUsers(currentUser);
      case httpMethod === 'GET' && path === '/api/user/search':
        return await searchUsers(queryStringParameters.keyWord);
      case httpMethod === 'GET' && path === '/api/user/followingList':
        return await getFollowingList(currentUser);
      default:
        return sendResponse(404, { error: 'Route not found' });
    }
  } catch (error) {
    console.error('User Handler Error:', error);
    return sendResponse(500, { error: error.message });
  }
};

const getCurrentUser = async (currentUser) => {
  try {
    const user = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    if (!user) {
      return sendResponse(404, { error: 'User not found' });
    }
    return sendResponse(200, user);
  } catch (error) {
    return sendResponse(500, { error: error.message });
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
      return sendResponse(404, { error: 'User not found' });
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

    return sendResponse(200, {
      ...user,
      posts,
      followers: followersData.filter(Boolean),
      following: followingData.filter(Boolean)
    });
  } catch (error) {
    return sendResponse(500, { error: error.message });
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

    return sendResponse(200, updatedUser);
  } catch (error) {
    return sendResponse(500, { error: error.message });
  }
};

const followUser = async (currentUser, targetUserId) => {
  try {
    const currentUserData = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    const targetUser = await dynamodb.get(process.env.USERS_TABLE, { userId: targetUserId });

    if (!targetUser) {
      return sendResponse(404, { error: 'Target user not found' });
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

    return sendResponse(200, { message: isFollowing ? 'Unfollowed' : 'Followed' });
  } catch (error) {
    return sendResponse(500, { error: error.message });
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

    return sendResponse(200, suggestedUsers);
  } catch (error) {
    return sendResponse(500, { error: error.message });
  }
};

const searchUsers = async (keyword) => {
  try {
    const allUsers = await dynamodb.scan(process.env.USERS_TABLE);
    const filteredUsers = allUsers.filter(user => 
      user.userName.toLowerCase().includes(keyword.toLowerCase()) ||
      user.name.toLowerCase().includes(keyword.toLowerCase())
    );

    return sendResponse(200, filteredUsers);
  } catch (error) {
    return sendResponse(500, { error: error.message });
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

    return sendResponse(200, followingData.filter(Boolean));
  } catch (error) {
    return sendResponse(500, { error: error.message });
  }
};
