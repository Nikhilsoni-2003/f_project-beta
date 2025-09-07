const { v4: uuidv4 } = require('uuid');
const dynamodb = require('../../utils/dynamodb');
const { extractUserFromToken } = require('../../utils/auth');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

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
  const { httpMethod, path, pathParameters, body } = event;
  const parsedBody = body ? JSON.parse(body) : {};

  // ✅ Handle CORS preflight
  if (httpMethod === 'OPTIONS') {
    return sendResponse(200, { message: 'CORS preflight OK' });
  }

  try {
    const currentUser = await extractUserFromToken(event);

    switch (true) {
      case httpMethod === 'POST' && path === '/api/story/upload':
        return await uploadStory(currentUser, parsedBody);
      case httpMethod === 'GET' && path === '/api/story/getAll':
        return await getAllStories(currentUser);
      case httpMethod === 'GET' && path.includes('/api/story/getByUserName/'):
        return await getStoryByUserName(pathParameters.userName);
      case httpMethod === 'GET' && path.includes('/api/story/view/'):
        return await viewStory(currentUser, pathParameters.storyId);
      default:
        return sendResponse(404, { error: 'Route not found' });
    }
  } catch (error) {
    console.error('Story Handler Error:', error);
    return sendResponse(500, { error: error.message });
  }
};

const uploadStory = async (currentUser, { mediaType, mediaKey }) => {
  try {
    const storyId = uuidv4();
    const mediaUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${mediaKey}`;
    const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours

    // ✅ Remove old stories of user
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

    return sendResponse(200, {
      ...story,
      _id: story.storyId,
      author: {
        _id: author.userId,
        userName: author.userName,
        profileImage: author.profileImage,
      },
    });
  } catch (error) {
    return sendResponse(500, { error: error.message });
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

    return sendResponse(200, storiesWithAuthors);
  } catch (error) {
    return sendResponse(500, { error: error.message });
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
      return sendResponse(404, { error: 'User not found' });
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

    return sendResponse(200, storiesWithAuthors);
  } catch (error) {
    return sendResponse(500, { error: error.message });
  }
};

const viewStory = async (currentUser, storyId) => {
  try {
    const story = await dynamodb.get(process.env.STORIES_TABLE, { storyId });
    if (!story) return sendResponse(404, { error: 'Story not found' });

    // ✅ Safe check if viewers array exists
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

    return sendResponse(200, { message: 'Story viewed' });
  } catch (error) {
    return sendResponse(500, { error: error.message });
  }
};
