const { v4: uuidv4 } = require('uuid');
const dynamodb = require('../../utils/dynamodb');
const { extractUserFromToken } = require('../../utils/auth');
const { createSuccessResponse, createErrorResponse } = require('../../utils/response');

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body } = event;
  const parsedBody = body ? JSON.parse(body) : {};

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({ message: 'CORS preflight OK' })
    };
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
        return createErrorResponse(404, 'Route not found');
    }
  } catch (error) {
    console.error('Story Handler Error:', error);
    return createErrorResponse(500, error.message);
  }
};

const uploadStory = async (currentUser, { mediaType, mediaKey }) => {
  try {
    const storyId = uuidv4();
    const mediaUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${mediaKey}`;
    const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now

    // Delete existing story if any
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
      expiresAt
    };

    await dynamodb.put(process.env.STORIES_TABLE, story);

    // Update user's story reference
    await dynamodb.update(
      process.env.USERS_TABLE,
      { userId: currentUser.userId },
      'SET story = :story',
      { ':story': storyId }
    );

    // Get author details for response
    const author = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    
    return createSuccessResponse({
      ...story,
      _id: story.storyId,
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

const getAllStories = async (currentUser) => {
  try {
    const user = await dynamodb.get(process.env.USERS_TABLE, { userId: currentUser.userId });
    const allStories = await dynamodb.scan(process.env.STORIES_TABLE);

    // Filter stories from following users only
    const followingStories = allStories.filter(story => 
      user.following.includes(story.authorId) && story.authorId !== currentUser.userId
    );

    // Sort by creation date (newest first)
    const sortedStories = followingStories.sort((a, b) => b.createdAt - a.createdAt);

    // Populate author details
    const storiesWithAuthors = await Promise.all(
      sortedStories.map(async (story) => {
        const author = await dynamodb.get(process.env.USERS_TABLE, { userId: story.authorId });
        return {
          ...story,
          _id: story.storyId,
          author: {
            _id: author.userId,
            userName: author.userName,
            profileImage: author.profileImage
          }
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

    const storiesWithAuthors = stories.map(story => ({
      ...story,
      _id: story.storyId,
      author: {
        _id: user.userId,
        userName: user.userName,
        profileImage: user.profileImage
      }
    }));

    return createSuccessResponse(storiesWithAuthors);
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
};

const viewStory = async (currentUser, storyId) => {
  try {
    const story = await dynamodb.get(process.env.STORIES_TABLE, { storyId });
    if (!story) {
      return createErrorResponse(404, 'Story not found');
    }

    // Add viewer if not already viewed
    if (!story.viewers.includes(currentUser.userId)) {
      const updatedViewers = [...story.viewers, currentUser.userId];
      
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