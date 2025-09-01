const { v4: uuidv4 } = require('uuid');
const dynamodb = require('../../utils/dynamodb');
const { extractUserFromToken } = require('../../utils/auth');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body } = event;
  const parsedBody = body ? JSON.parse(body) : {};

  try {
    const currentUser = await extractUserFromToken(event);

    switch (true) {
      case httpMethod === 'POST' && path === '/api/loop/upload':
        return await uploadLoop(currentUser, parsedBody);
      case httpMethod === 'GET' && path === '/api/loop/getAll':
        return await getAllLoops();
      case httpMethod === 'GET' && path.includes('/api/loop/like/'):
        return await likeLoop(currentUser, pathParameters.loopId);
      case httpMethod === 'POST' && path.includes('/api/loop/comment/'):
        return await commentLoop(currentUser, pathParameters.loopId, parsedBody);
      default:
        return createErrorResponse(404, 'Route not found');
    }
  } catch (error) {
    console.error('Loop Handler Error:', error);
    return createErrorResponse(500, error.message);
  }
};

const uploadLoop = async (currentUser, { caption, mediaKey }) => {
  try {
    const loopId = uuidv4();
    const mediaUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${mediaKey}`;

    const loop = {
      loopId,
      authorId: currentUser.userId,
      caption,
      media: mediaUrl,
      likes: [],
      comments: [],
      createdAt: Date.now()
    };

    await dynamodb.put(process.env.LOOPS_TABLE, loop);

    // Get author details for response
    const author = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    
    return createSuccessResponse({
      ...loop,
      _id: loop.loopId,
      author: {
        _id: author.userId,
        userName: author.userName,
        profileImage: author.profileImage
      }
    });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const getAllLoops = async () => {
  try {
    const allLoops = await dynamodb.scan(process.env.LOOPS_TABLE);
    
    // Sort by creation date (newest first)
    const sortedLoops = allLoops.sort((a, b) => b.createdAt - a.createdAt);

    // Populate author details
    const loopsWithAuthors = await Promise.all(
      sortedLoops.map(async (loop) => {
        const author = await dynamodb.get(process.env.USERS_TABLE, { userId: loop.authorId });
        return {
          ...loop,
          _id: loop.loopId,
          author: {
            _id: author.userId,
            userName: author.userName,
            profileImage: author.profileImage
          }
        };
      })
    );

    return createSuccessResponse(loopsWithAuthors);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const likeLoop = async (currentUser, loopId) => {
  try {
    const loop = await dynamodb.get(process.env.LOOPS_TABLE, { loopId });
    if (!loop) {
      return createErrorResponse(404, 'Loop not found');
    }

    const isLiked = loop.likes.includes(currentUser.userId);
    const updatedLikes = isLiked 
      ? loop.likes.filter(id => id !== currentUser.userId)
      : [...loop.likes, currentUser.userId];

    const updatedLoop = await dynamodb.update(
      process.env.LOOPS_TABLE,
      { loopId },
      'SET likes = :likes',
      { ':likes': updatedLikes }
    );

    // Create notification if liked
    if (!isLiked && loop.authorId !== currentUser.userId) {
      const currentUserData = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
      const notification = {
        notificationId: uuidv4(),
        receiverId: loop.authorId,
        senderId: currentUser.userId,
        type: 'like',
        loopId: loopId,
        message: `${currentUserData.userName} liked your loop`,
        isRead: false,
        createdAt: Date.now()
      };

      await dynamodb.put(process.env.NOTIFICATIONS_TABLE, notification);
    }

    // Get author details for response
    const author = await dynamodb.get(process.env.USERS_TABLE, { userId: loop.authorId });
    
    return createSuccessResponse({
      ...updatedLoop,
      _id: updatedLoop.loopId,
      author: {
        _id: author.userId,
        userName: author.userName,
        profileImage: author.profileImage
      }
    });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const commentLoop = async (currentUser, loopId, { message }) => {
  try {
    const loop = await dynamodb.get(process.env.LOOPS_TABLE, { loopId });
    if (!loop) {
      return createErrorResponse(404, 'Loop not found');
    }

    const currentUserData = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    
    const comment = {
      commentId: uuidv4(),
      authorId: currentUser.userId,
      message,
      createdAt: Date.now(),
      author: {
        userId: currentUser.userId,
        userName: currentUserData.userName,
        profileImage: currentUserData.profileImage
      }
    };

    const updatedComments = [...loop.comments, comment];

    const updatedLoop = await dynamodb.update(
      process.env.LOOPS_TABLE,
      { loopId },
      'SET comments = :comments',
      { ':comments': updatedComments }
    );

    // Create notification
    if (loop.authorId !== currentUser.userId) {
      const notification = {
        notificationId: uuidv4(),
        receiverId: loop.authorId,
        senderId: currentUser.userId,
        type: 'comment',
        loopId: loopId,
        message: `${currentUserData.userName} commented on your loop`,
        isRead: false,
        createdAt: Date.now()
      };

      await dynamodb.put(process.env.NOTIFICATIONS_TABLE, notification);
    }

    // Get author details for response
    const author = await dynamodb.get(process.env.USERS_TABLE, { userId: loop.authorId });
    
    return createSuccessResponse({
      ...updatedLoop,
      _id: updatedLoop.loopId,
      author: {
        _id: author.userId,
        userName: author.userName,
        profileImage: author.profileImage
      }
    });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};