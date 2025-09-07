const { v4: uuidv4 } = require('uuid');
const dynamodb = require('../../utils/dynamodb');
const { extractUserFromToken } = require('../../utils/auth');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

const allowedOrigins = [
  'http://localhost:5173',
  'https://dsvtq5o5a0ykh.cloudfront.net'
];

const getCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
});

const withCors = (response, origin) => ({
  ...response,
  headers: {
    ...(response.headers || {}),
    ...getCorsHeaders(origin)
  }
});

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body, headers } = event;
  const parsedBody = body ? JSON.parse(body) : {};
  const origin = headers?.origin || headers?.Origin || '*';

  // Preflight response
  if (httpMethod === 'OPTIONS') {
    return withCors({
      statusCode: 200,
      body: JSON.stringify({ message: 'CORS preflight OK' })
    }, origin);
  }

  try {
    const currentUser = await extractUserFromToken(event);
    let response;

    switch (true) {
      case httpMethod === 'POST' && path === '/api/loop/upload':
        response = await uploadLoop(currentUser, parsedBody);
        break;
      case httpMethod === 'GET' && path === '/api/loop/getAll':
        response = await getAllLoops();
        break;
      case httpMethod === 'GET' && path.includes('/api/loop/like/'):
        response = await likeLoop(currentUser, pathParameters.loopId);
        break;
      case httpMethod === 'POST' && path.includes('/api/loop/comment/'):
        response = await commentLoop(currentUser, pathParameters.loopId, parsedBody);
        break;
      default:
        response = createErrorResponse(404, 'Route not found');
    }

    return withCors(response, origin);
  } catch (error) {
    console.error('Loop Handler Error:', error);
    return withCors(createErrorResponse(500, error.message), origin);
  }
};

// -------------------- Functions --------------------

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
    const sortedLoops = allLoops.sort((a, b) => b.createdAt - a.createdAt);

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
    if (!loop) return createErrorResponse(404, 'Loop not found');

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

    if (!isLiked && loop.authorId !== currentUser.userId) {
      const currentUserData = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
      const notification = {
        notificationId: uuidv4(),
        receiverId: loop.authorId,
        senderId: currentUser.userId,
        type: 'like',
        loopId,
        message: `${currentUserData.userName} liked your loop`,
        isRead: false,
        createdAt: Date.now()
      };
      await dynamodb.put(process.env.NOTIFICATIONS_TABLE, notification);
    }

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
    if (!loop) return createErrorResponse(404, 'Loop not found');

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

    if (loop.authorId !== currentUser.userId) {
      const notification = {
        notificationId: uuidv4(),
        receiverId: loop.authorId,
        senderId: currentUser.userId,
        type: 'comment',
        loopId,
        message: `${currentUserData.userName} commented on your loop`,
        isRead: false,
        createdAt: Date.now()
      };
      await dynamodb.put(process.env.NOTIFICATIONS_TABLE, notification);
    }

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
