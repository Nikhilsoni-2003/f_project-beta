const { v4: uuidv4 } = require('uuid');
const dynamodb = require('../../utils/dynamodb');
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
  const { httpMethod, path, pathParameters, body } = event;
  const parsedBody = body ? JSON.parse(body) : {};
  const origin = event.headers?.origin || event.headers?.Origin || '*';

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
      case httpMethod === 'POST' && path === '/api/story/upload':
        response = await uploadStory(currentUser, parsedBody);
        break;
      case httpMethod === 'GET' && path === '/api/story/getAll':
        response = await getAllStories(currentUser);
        break;
      case httpMethod === 'GET' && path.includes('/api/story/getByUserName/'):
        response = await getStoryByUserName(pathParameters.userName);
        break;
      case httpMethod === 'GET' && path.includes('/api/story/view/'):
        response = await viewStory(currentUser, pathParameters.storyId);
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
    console.error('Story Handler Error:', error);
    const response = createErrorResponse(500, error.message);
    response.headers = getCorsHeaders(origin);
    return response;
  }
};

const uploadStory = async (currentUser, { mediaType, mediaKey }) => {
  try {
    const storyId = uuidv4();
    const mediaUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${mediaKey}`;
    const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours

    // Remove old stories of user
    const existingStories = await dynamodb.query(
      process.env.STORIES_TABLE,
      'authorId = :authorId',
      { ':authorId': currentUser.userId },
      'author-index'
    );
    for (const story of existingStories) {
      await dynamodb.delete(process.env.STORIES_TABLE, { storyId: story.storyId });
    }

    const story = {
      storyId,
      authorId: currentUser.userId,
      mediaType,
      media: mediaUrl,
      viewers: [],
      createdAt: Date.now(),
      expiresAt,
    };

    await dynamodb.put(process.env.STORIES_TABLE, story);

    await dynamodb.update(
      process.env.USERS_TABLE,
      { userId: currentUser.userId },
      'SET story = :story',
      { ':story': storyId }
    );

    const author = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });

    return createSuccessResponse({
      ...story,
      _id: story.storyId,
      author: {
        _id: author.userId,
        userName: author.userName,
        profileImage: author.profileImage,
      },
    });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const getAllStories = async (currentUser) => {
  try {
    const user = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    const allStories = await dynamodb.scan(process.env.STORIES_TABLE);

    const followingStories = allStories.filter(
      (story) => user.following.includes(story.authorId) && story.authorId !== currentUser.userId
    );

    const sortedStories = followingStories.sort((a, b) => b.createdAt - a.createdAt);

    const storiesWithAuthors = await Promise.all(
      sortedStories.map(async (story) => {
        const author = await dynamodb.get(process.env.USERS_TABLE, { userId: story.authorId });
        return {
          ...story,
          _id: story.storyId,
          author: {
            _id: author.userId,
            userName: author.userName,
            profileImage: author.profileImage,
          },
        };
      })
    );

    return createSuccessResponse(storiesWithAuthors);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const getStoryByUserName = async (userName) => {
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
    const stories = await dynamodb.query(
      process.env.STORIES_TABLE,
      'authorId = :authorId',
      { ':authorId': user.userId },
      'author-index'
    );

    const storiesWithAuthors = stories.map((story) => ({
      ...story,
      _id: story.storyId,
      author: {
        _id: user.userId,
        userName: user.userName,
        profileImage: user.profileImage,
      },
    }));

    return createSuccessResponse(storiesWithAuthors);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const viewStory = async (currentUser, storyId) => {
  try {
    const story = await dynamodb.get(process.env.STORIES_TABLE, { storyId });
    if (!story) return createErrorResponse(404, 'Story not found');

    // Safe check if viewers array exists
    const viewers = Array.isArray(story.viewers) ? story.viewers : [];

    if (!viewers.includes(currentUser.userId)) {
      const updatedViewers = [...viewers, currentUser.userId];
      await dynamodb.update(
        process.env.STORIES_TABLE,
        { storyId },
        'SET viewers = :viewers',
        { ':viewers': updatedViewers }
      );
    }

    return createSuccessResponse({ message: 'Story viewed' });
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};
